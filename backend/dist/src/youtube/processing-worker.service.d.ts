import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { YoutubeService } from './youtube.service';
export declare class ProcessingWorkerService implements OnModuleInit, OnModuleDestroy {
    private prismaService;
    private youtubeService;
    private readonly logger;
    private timer;
    private active;
    private readonly pollIntervalMs;
    private readonly concurrency;
    constructor(prismaService: PrismaService, youtubeService: YoutubeService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private tick;
    private processNext;
}
