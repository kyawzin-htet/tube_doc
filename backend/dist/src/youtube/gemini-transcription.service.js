"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GeminiTranscriptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiTranscriptionService = void 0;
const common_1 = require("@nestjs/common");
const generative_ai_1 = require("@google/generative-ai");
const server_1 = require("@google/generative-ai/server");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
let GeminiTranscriptionService = GeminiTranscriptionService_1 = class GeminiTranscriptionService {
    logger = new common_1.Logger(GeminiTranscriptionService_1.name);
    genAI;
    fileManager;
    modelName = process.env.GEMINI_TRANSCRIPTION_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    ytdlpTimeoutMs = Number(process.env.YTDLP_TIMEOUT_MS ?? 10 * 60 * 1000);
    ffmpegTimeoutMs = Number(process.env.FFMPEG_TIMEOUT_MS ?? 10 * 60 * 1000);
    fileProcessingTimeoutMs = Number(process.env.GEMINI_FILE_TIMEOUT_MS ?? 5 * 60 * 1000);
    chunkDurationSeconds = Number(process.env.GEMINI_CHUNK_SECONDS ?? 300);
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            this.fileManager = new server_1.GoogleAIFileManager(apiKey);
        }
        else {
            this.genAI = null;
            this.fileManager = null;
        }
    }
    isConfigured() {
        return Boolean(this.genAI && this.fileManager);
    }
    async transcribe(videoId, language = 'auto', options = {}) {
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
            await options.onStage?.('transcribing', `Transcribing ${chunkPaths.length} chunk${chunkPaths.length === 1 ? '' : 's'} with Gemini API...`);
            const transcripts = [];
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error in Gemini transcription for ${videoId}: ${message}`);
            throw error;
        }
        finally {
            fs.rmSync(tempRoot, { recursive: true, force: true });
        }
    }
    async transcribeChunk(chunkPath, language) {
        const uploadResponse = await this.fileManager.uploadFile(chunkPath, {
            mimeType: 'audio/mpeg',
            displayName: path.basename(chunkPath),
        });
        const file = await this.waitForFileToBecomeActive(uploadResponse.file.name);
        try {
            const languageInstruction = language && language !== 'auto'
                ? `The spoken language is ${language}. Keep the transcript in that original language.`
                : 'Detect the spoken language automatically and keep the transcript in the original language.';
            const model = this.genAI.getGenerativeModel({ model: this.modelName });
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
        }
        finally {
            try {
                await this.fileManager.deleteFile(uploadResponse.file.name);
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Failed to delete Gemini file ${uploadResponse.file.name}: ${message}`);
            }
        }
    }
    async waitForFileToBecomeActive(fileId) {
        const startedAt = Date.now();
        while (Date.now() - startedAt < this.fileProcessingTimeoutMs) {
            const file = await this.fileManager.getFile(fileId);
            if (file.state === server_1.FileState.ACTIVE) {
                return file;
            }
            if (file.state === server_1.FileState.FAILED) {
                throw new Error(file.error?.message || `Gemini file processing failed for ${fileId}`);
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        throw new Error(`Gemini file processing timed out after ${this.fileProcessingTimeoutMs}ms`);
    }
    downloadAudioWithYtDlp(videoId, outputPath) {
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
            const proc = (0, child_process_1.spawn)('yt-dlp', args);
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
    getAudioDurationSeconds(audioPath) {
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)('ffprobe', [
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
    async createChunkFiles(audioPath, tempRoot, durationSeconds) {
        const totalChunks = Math.max(1, Math.ceil(durationSeconds / this.chunkDurationSeconds));
        const chunkPaths = [];
        for (let index = 0; index < totalChunks; index += 1) {
            const start = index * this.chunkDurationSeconds;
            const length = Math.min(this.chunkDurationSeconds, Math.max(1, durationSeconds - start));
            const chunkPath = path.join(tempRoot, `chunk-${String(index + 1).padStart(3, '0')}.mp3`);
            await this.extractChunk(audioPath, chunkPath, start, length);
            chunkPaths.push(chunkPath);
        }
        return chunkPaths;
    }
    extractChunk(audioPath, outputPath, startSeconds, lengthSeconds) {
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)('ffmpeg', [
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
};
exports.GeminiTranscriptionService = GeminiTranscriptionService;
exports.GeminiTranscriptionService = GeminiTranscriptionService = GeminiTranscriptionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GeminiTranscriptionService);
//# sourceMappingURL=gemini-transcription.service.js.map