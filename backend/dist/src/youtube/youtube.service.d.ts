import { AccountService } from '../account/account.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { TranscriptService } from './transcript.service';
import { WhisperService } from './whisper.service';
import { SummaryService } from './summary.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { YoutubeClientService } from './youtube-client.service';
import { GeminiTranscriptionService } from './gemini-transcription.service';
interface StatusPayload {
    jobId: string;
    videoId: string;
    status: string;
    message: string;
    data?: unknown;
}
export declare class YoutubeService {
    private transcriptService;
    private whisperService;
    private geminiTranscriptionService;
    private summaryService;
    private accountService;
    private prismaService;
    private eventEmitter;
    private youtubeClient;
    private readonly logger;
    private readonly latestStatusByJobId;
    private readonly summaryInputCostPer1k;
    private readonly summaryOutputCostPer1k;
    private readonly transcriptionInputCostPer1k;
    private readonly transcriptionOutputCostPer1k;
    constructor(transcriptService: TranscriptService, whisperService: WhisperService, geminiTranscriptionService: GeminiTranscriptionService, summaryService: SummaryService, accountService: AccountService, prismaService: PrismaService, eventEmitter: EventEmitter2, youtubeClient: YoutubeClientService);
    extractVideoId(url: string): string | null;
    processVideo(url: string, language?: string, jobId?: string, userId?: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        videoUrl: string;
        videoId: string;
        title: string | null;
        transcript: string | null;
        summary: string | null;
        processingMethod: string | null;
        jobId: string | null;
    }>;
    private finalizeVideo;
    private updateJob;
    emitStatus(jobId: string, videoId: string, status: string, message: string, data?: unknown): void;
    getLastStatus(jobId: string): StatusPayload | undefined;
    findAll(user: AuthenticatedUser, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            createdAt: Date;
            userId: string;
            videoUrl: string;
            videoId: string;
            title: string | null;
            transcript: string | null;
            summary: string | null;
            processingMethod: string | null;
            jobId: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findById(id: string, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        videoUrl: string;
        videoId: string;
        title: string | null;
        transcript: string | null;
        summary: string | null;
        processingMethod: string | null;
        jobId: string | null;
    } | null>;
    remove(id: string, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        videoUrl: string;
        videoId: string;
        title: string | null;
        transcript: string | null;
        summary: string | null;
        processingMethod: string | null;
        jobId: string | null;
    }>;
    private assertVideoAccess;
    private estimateTokens;
}
export {};
