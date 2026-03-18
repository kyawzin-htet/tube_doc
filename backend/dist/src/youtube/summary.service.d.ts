export declare class SummaryService {
    private readonly logger;
    private readonly genAI;
    private readonly summaryModel;
    constructor();
    usesGemini(): boolean;
    summarize(transcript: string, language?: string): Promise<string>;
    summarizeChunk(text: string, language?: string): Promise<string>;
    summarizeFromChunks(chunks: string[], language?: string): Promise<string>;
    private geminiSummarize;
    private geminiSummarizeChunk;
    private geminiSummarizeFromChunks;
    private extractiveSummarize;
}
