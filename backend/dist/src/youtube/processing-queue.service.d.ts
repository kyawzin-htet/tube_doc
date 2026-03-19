import type { AuthenticatedUser } from '../auth/auth.types';
import { AccountService } from '../account/account.service';
import { PrismaService } from '../prisma/prisma.service';
import { YoutubeService } from './youtube.service';
export declare class ProcessingQueueService {
    private prismaService;
    private youtubeService;
    private accountService;
    constructor(prismaService: PrismaService, youtubeService: YoutubeService, accountService: AccountService);
    enqueue(url: string, language: string | undefined, user: AuthenticatedUser): Promise<{
        jobId: string;
        videoId: string;
    }>;
    getJobForUser(jobId: string, user: AuthenticatedUser): Promise<{
        error: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        videoUrl: string;
        videoId: string;
        totalTokens: number;
        estimatedCostUsd: number;
        status: string;
        transcriptCharacters: number;
        summaryCharacters: number;
        transcriptionInputTokens: number;
        transcriptionOutputTokens: number;
        summaryInputTokens: number;
        summaryOutputTokens: number;
        progress: number;
        finishedAt: Date | null;
        videoRecordId: string | null;
        language: string;
        currentChunk: number | null;
        totalChunks: number | null;
        partialSummary: string | null;
        partialTranscript: string | null;
        attempts: number;
        maxAttempts: number;
        startedAt: Date | null;
    } | null>;
}
