import { MessageEvent } from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable } from 'rxjs';
import { ProcessingQueueService } from './processing-queue.service';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
export declare class VideosController {
    private youtubeService;
    private eventEmitter;
    private processingQueue;
    constructor(youtubeService: YoutubeService, eventEmitter: EventEmitter2, processingQueue: ProcessingQueueService);
    process(url: string, language: string | undefined, user: AuthenticatedUser): Promise<{
        jobId: string;
        videoId: string;
    }>;
    findAll(user: AuthenticatedUser, page: number, limit: number): Promise<{
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
    status(jobId: string, user: AuthenticatedUser): Promise<Observable<MessageEvent>>;
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
    download(id: string, format: string | undefined, user: AuthenticatedUser, res: Response): Promise<void>;
    private buildStatusFromJob;
}
