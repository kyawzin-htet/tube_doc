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
export declare class GeminiTranscriptionService {
    private readonly logger;
    private readonly genAI;
    private readonly fileManager;
    private readonly modelName;
    private readonly ytdlpTimeoutMs;
    private readonly ffmpegTimeoutMs;
    private readonly fileProcessingTimeoutMs;
    private readonly chunkDurationSeconds;
    constructor();
    isConfigured(): boolean;
    transcribe(videoId: string, language?: string, options?: TranscribeOptions): Promise<string>;
    private transcribeChunk;
    private waitForFileToBecomeActive;
    private downloadAudioWithYtDlp;
    private getAudioDurationSeconds;
    private createChunkFiles;
    private extractChunk;
}
export {};
