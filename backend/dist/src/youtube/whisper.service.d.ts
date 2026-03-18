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
export declare class WhisperService {
    private readonly logger;
    private readonly transcriptScriptPath;
    private readonly modelSize;
    private readonly ytdlpTimeoutMs;
    private readonly whisperTimeoutMs;
    private readonly ffmpegTimeoutMs;
    private readonly chunkDurationSeconds;
    transcribe(videoId: string, language?: string, options?: TranscribeOptions): Promise<string>;
    private downloadAudioWithYtDlp;
    private getAudioDurationSeconds;
    private createChunkFiles;
    private extractChunk;
    private transcribeChunksWithLocalWhisper;
}
export {};
