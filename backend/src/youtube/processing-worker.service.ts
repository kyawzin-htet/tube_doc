import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { YoutubeService } from './youtube.service';

@Injectable()
export class ProcessingWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProcessingWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private active = 0;
  private readonly pollIntervalMs = Number(process.env.JOB_POLL_INTERVAL_MS ?? 2000);
  private readonly concurrency = Math.max(1, Number(process.env.JOB_CONCURRENCY ?? 1));

  constructor(
    private prismaService: PrismaService,
    private youtubeService: YoutubeService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => this.tick(), this.pollIntervalMs);
    this.tick();
    this.logger.log(`Queue worker started (interval ${this.pollIntervalMs}ms, concurrency ${this.concurrency})`);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick() {
    if (this.active >= this.concurrency) return;
    this.active += 1;
    try {
      await this.processNext();
    } finally {
      this.active -= 1;
    }
  }

  private async processNext() {
    const job = await this.prismaService.processingJob.findFirst({
      where: { status: 'queued' },
      orderBy: { createdAt: 'asc' },
    });
    if (!job) return;

    const claimed = await this.prismaService.processingJob.updateMany({
      where: { id: job.id, status: 'queued' },
      data: {
        status: 'running',
        startedAt: new Date(),
        attempts: { increment: 1 },
        progress: 0,
      },
    });

    if (claimed.count === 0) return;

    this.youtubeService.emitStatus(job.id, job.videoId, 'processing_started', 'Processing started...');

    try {
      await this.youtubeService.processVideo(job.videoUrl, job.language, job.id, job.userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prismaService.processingJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          error: message,
        },
      });
    }
  }
}
