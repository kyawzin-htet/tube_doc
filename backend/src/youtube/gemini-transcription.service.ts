import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FileState, GoogleAIFileManager } from '@google/generative-ai/server';
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
export class GeminiTranscriptionService {
  private readonly logger = new Logger(GeminiTranscriptionService.name);
  private readonly genAI: GoogleGenerativeAI | null;
  private readonly fileManager: GoogleAIFileManager | null;
  private readonly modelName = process.env.GEMINI_TRANSCRIPTION_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  private readonly ytdlpTimeoutMs = Number(process.env.YTDLP_TIMEOUT_MS ?? 10 * 60 * 1000);
  private readonly ffmpegTimeoutMs = Number(process.env.FFMPEG_TIMEOUT_MS ?? 10 * 60 * 1000);
  private readonly fileProcessingTimeoutMs = Number(process.env.GEMINI_FILE_TIMEOUT_MS ?? 5 * 60 * 1000);
  private readonly chunkDurationSeconds = Number(process.env.GEMINI_CHUNK_SECONDS ?? 300);

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.fileManager = new GoogleAIFileManager(apiKey);
    } else {
      this.genAI = null;
      this.fileManager = null;
    }
  }

  isConfigured() {
    return Boolean(this.genAI && this.fileManager);
  }

  async transcribe(
    videoId: string,
    language = 'auto',
    options: TranscribeOptions = {},
  ): Promise<string> {
    if (!this.genAI || !this.fileManager) {
      throw new Error('GEMINI_API_KEY not set');
    }

    const tempRoot = path.join(os.tmpdir(), `tubedoc-gemini-${videoId}-${Date.now()}`);
    const mp3Path = path.join(tempRoot, `${videoId}.mp3`);

    try {
      fs.mkdirSync(tempRoot, { recursive: true });

      await options.onStage?.('downloading_audio', 'Downloading audio with yt-dlp...');
      await this.downloadAudioWithYtDlp(videoId, mp3Path);

      const duration = await this.getAudioDurationSeconds(mp3Path);
      const chunkPaths = await this.createChunkFiles(mp3Path, tempRoot, duration);

      await options.onChunksReady?.(chunkPaths.length);
      await options.onStage?.(
        'transcribing',
        `Transcribing ${chunkPaths.length} chunk${chunkPaths.length === 1 ? '' : 's'} with Gemini API...`,
      );

      const transcripts: string[] = [];
      for (let index = 0; index < chunkPaths.length; index += 1) {
        const transcript = await this.transcribeChunk(chunkPaths[index], language);
        transcripts.push(transcript);

        if (options.onChunk) {
          await options.onChunk({
            index,
            total: chunkPaths.length,
            transcript,
            progress: Math.round(((index + 1) / chunkPaths.length) * 100),
          });
        }
      }

      return transcripts.filter((text) => text.trim().length > 0).join(' ').trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in Gemini transcription for ${videoId}: ${message}`);
      throw error;
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }

  private async transcribeChunk(chunkPath: string, language: string): Promise<string> {
    const uploadResponse = await this.fileManager!.uploadFile(chunkPath, {
      mimeType: 'audio/mpeg',
      displayName: path.basename(chunkPath),
    });

    const file = await this.waitForFileToBecomeActive(uploadResponse.file.name);
    try {
      const languageInstruction = language && language !== 'auto'
        ? `The spoken language is ${language}. Keep the transcript in that original language.`
        : 'Detect the spoken language automatically and keep the transcript in the original language.';

      const model = this.genAI!.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent([
        {
          text: `Transcribe this audio chunk as plain text.
- Return only the transcript text.
- Do not summarize.
- Do not add speaker labels unless the audio explicitly identifies speakers.
- Preserve wording naturally and avoid inventing missing words.
- ${languageInstruction}`,
        },
        {
          fileData: {
            mimeType: file.mimeType,
            fileUri: file.uri,
          },
        },
      ]);

      return result.response.text().trim();
    } finally {
      try {
        await this.fileManager!.deleteFile(uploadResponse.file.name);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to delete Gemini file ${uploadResponse.file.name}: ${message}`);
      }
    }
  }

  private async waitForFileToBecomeActive(fileId: string) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < this.fileProcessingTimeoutMs) {
      const file = await this.fileManager!.getFile(fileId);
      if (file.state === FileState.ACTIVE) {
        return file;
      }

      if (file.state === FileState.FAILED) {
        throw new Error(file.error?.message || `Gemini file processing failed for ${fileId}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(`Gemini file processing timed out after ${this.fileProcessingTimeoutMs}ms`);
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
}
