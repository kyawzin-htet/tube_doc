import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';

type StageCallback = (status: string, message: string) => void | Promise<void>;
type ChunksReadyCallback = (count: number) => void | Promise<void>;
type ChunkCallback = (payload: {
  index: number;
  total: number;
  transcript: string;
  progress: number;
}) => void | Promise<void>;

interface TranscribeOptions {
  onStage?: StageCallback;
  onChunksReady?: ChunksReadyCallback;
  onChunk?: ChunkCallback;
}

@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name);
  private readonly transcriptScriptPath = path.join(process.cwd(), 'src/youtube/transcribe.py');
  private readonly modelSize = process.env.WHISPER_MODEL_SIZE || 'large-v3';
  private readonly ytdlpTimeoutMs = Number(process.env.YTDLP_TIMEOUT_MS ?? 10 * 60 * 1000);
  private readonly whisperTimeoutMs = Number(process.env.WHISPER_TIMEOUT_MS ?? 30 * 60 * 1000);
  private readonly ffmpegTimeoutMs = Number(process.env.FFMPEG_TIMEOUT_MS ?? 10 * 60 * 1000);
  private readonly chunkDurationSeconds = Number(process.env.WHISPER_CHUNK_SECONDS ?? 300);

  async transcribe(
    videoId: string,
    language = 'auto',
    options: TranscribeOptions = {},
  ): Promise<string> {
    const tempRoot = path.join(os.tmpdir(), `tubedoc-${videoId}-${Date.now()}`);
    const mp3Path = path.join(tempRoot, `${videoId}.mp3`);

    try {
      fs.mkdirSync(tempRoot, { recursive: true });

      await options.onStage?.('downloading_audio', 'Downloading audio with yt-dlp...');
      this.logger.log(`Downloading audio for video: ${videoId}`);
      await this.downloadAudioWithYtDlp(videoId, mp3Path);

      const duration = await this.getAudioDurationSeconds(mp3Path);
      const chunkPaths = await this.createChunkFiles(mp3Path, tempRoot, duration);

      await options.onChunksReady?.(chunkPaths.length);
      await options.onStage?.(
        'transcribing',
        `Transcribing ${chunkPaths.length} chunk${chunkPaths.length === 1 ? '' : 's'} locally with Whisper (${this.modelSize})...`,
      );

      const transcripts = await this.transcribeChunksWithLocalWhisper(chunkPaths, language, options.onChunk);
      return transcripts.filter((text) => text.trim().length > 0).join(' ').trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in Whisper transcription for ${videoId}: ${message}`);
      throw error;
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }

  private downloadAudioWithYtDlp(videoId: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const args = [
        '-f', 'bestaudio',
        '--no-playlist',
        '-o', outputPath,
        '--quiet',
        '--no-warnings',
        '-x', '--audio-format', 'mp3',
        url,
      ];

      this.logger.log(`Running yt-dlp for ${videoId}`);
      const proc = spawn('yt-dlp', args);
      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`yt-dlp timed out after ${this.ytdlpTimeoutMs}ms`));
      }, this.ytdlpTimeoutMs);

      let stderr = '';
      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          if (fs.existsSync(outputPath)) {
            resolve();
            return;
          }

          if (fs.existsSync(`${outputPath}.mp3`)) {
            fs.renameSync(`${outputPath}.mp3`, outputPath);
            resolve();
            return;
          }

          reject(new Error(`yt-dlp succeeded but output file not found. Stderr: ${stderr}`));
          return;
        }

        reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
      });
    });
  }

  private getAudioDurationSeconds(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const proc = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        audioPath,
      ]);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
          return;
        }

        const duration = Number(stdout.trim());
        if (!Number.isFinite(duration) || duration <= 0) {
          reject(new Error(`Could not determine audio duration from ffprobe output: ${stdout}`));
          return;
        }
        resolve(duration);
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn ffprobe: ${err.message}`));
      });
    });
  }

  private async createChunkFiles(audioPath: string, tempRoot: string, durationSeconds: number): Promise<string[]> {
    const totalChunks = Math.max(1, Math.ceil(durationSeconds / this.chunkDurationSeconds));
    const chunkPaths: string[] = [];

    for (let index = 0; index < totalChunks; index += 1) {
      const start = index * this.chunkDurationSeconds;
      const length = Math.min(this.chunkDurationSeconds, Math.max(1, durationSeconds - start));
      const chunkPath = path.join(tempRoot, `chunk-${String(index + 1).padStart(3, '0')}.mp3`);
      await this.extractChunk(audioPath, chunkPath, start, length);
      chunkPaths.push(chunkPath);
    }

    return chunkPaths;
  }

  private extractChunk(audioPath: string, outputPath: string, startSeconds: number, lengthSeconds: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('ffmpeg', [
        '-y',
        '-ss', `${startSeconds}`,
        '-t', `${lengthSeconds}`,
        '-i', audioPath,
        '-vn',
        '-acodec', 'copy',
        outputPath,
      ]);

      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`ffmpeg timed out after ${this.ffmpegTimeoutMs}ms while creating audio chunks`));
      }, this.ffmpegTimeoutMs);

      let stderr = '';
      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve();
          return;
        }
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
      });
    });
  }

  private transcribeChunksWithLocalWhisper(
    chunkPaths: string[],
    language: string,
    onChunk?: ChunkCallback,
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.logger.log(`Calling local Whisper for ${chunkPaths.length} chunk(s) using model ${this.modelSize}`);

      const args = [this.transcriptScriptPath, '--jsonl', this.modelSize, language, ...chunkPaths];
      const proc = spawn('python3', args);
      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`Whisper timed out after ${this.whisperTimeoutMs}ms`));
      }, this.whisperTimeoutMs);

      const transcripts = new Array<string>(chunkPaths.length).fill('');
      const chunkIndexByPath = new Map(chunkPaths.map((chunkPath, index) => [chunkPath, index]));
      let stdoutBuffer = '';
      let stderr = '';
      let pendingCallbacks = Promise.resolve();
      let settled = false;

      const handleLine = (line: string) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          return;
        }

        let payload: { path?: string; text?: string; index?: number };
        try {
          payload = JSON.parse(trimmedLine);
        } catch (error) {
          throw new Error(`Failed to parse Whisper chunk output: ${trimmedLine}`);
        }

        const index = typeof payload.index === 'number'
          ? payload.index
          : chunkIndexByPath.get(payload.path || '') ?? -1;
        if (index < 0 || index >= chunkPaths.length) {
          throw new Error(`Whisper returned an unknown chunk reference: ${trimmedLine}`);
        }

        const transcript = (payload.text || '').trim();
        transcripts[index] = transcript;

        if (onChunk) {
          const progress = Math.round(((index + 1) / chunkPaths.length) * 100);
          pendingCallbacks = pendingCallbacks.then(() => onChunk({
            index,
            total: chunkPaths.length,
            transcript,
            progress,
          }));
        }
      };

      proc.stdout.on('data', (chunk) => {
        stdoutBuffer += chunk.toString();
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() ?? '';

        try {
          for (const line of lines) {
            handleLine(line);
          }
        } catch (error) {
          settled = true;
          clearTimeout(timeout);
          proc.kill('SIGKILL');
          reject(error);
        }
      });

      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('close', async (code) => {
        if (settled) {
          return;
        }

        clearTimeout(timeout);

        try {
          if (stdoutBuffer.trim()) {
            handleLine(stdoutBuffer);
          }
          await pendingCallbacks;
        } catch (error) {
          reject(error);
          return;
        }

        if (stderr.trim()) {
          this.logger.debug(`Whisper stderr: ${stderr}`);
        }

        if (code === 0) {
          this.logger.log('Local Whisper chunk transcription complete');
          resolve(transcripts);
          return;
        }

        reject(new Error(`Whisper process exited with code ${code}: ${stderr}`));
      });

      proc.on('error', (err) => {
        if (settled) {
          return;
        }
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn whisper: ${err.message}`));
      });
    });
  }
}
