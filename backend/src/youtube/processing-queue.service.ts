import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccountService } from '../account/account.service';
import { PrismaService } from '../prisma/prisma.service';
import { YoutubeService } from './youtube.service';

@Injectable()
export class ProcessingQueueService {
  constructor(
    private prismaService: PrismaService,
    private youtubeService: YoutubeService,
    private accountService: AccountService,
  ) {}

  async enqueue(url: string, language = 'auto', user: AuthenticatedUser) {
    const videoId = this.youtubeService.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    await this.accountService.ensureCanTranslate(user.id);

    const job = await this.prismaService.processingJob.create({
      data: {
        videoUrl: url,
        videoId,
        language,
        status: 'queued',
        userId: user.id,
      },
    });

    this.youtubeService.emitStatus(job.id, videoId, 'queued', 'Job queued. Waiting for a worker...');
    return { jobId: job.id, videoId };
  }

  async getJobForUser(jobId: string, user: AuthenticatedUser) {
    return this.prismaService.processingJob.findFirst({
      where: user.role === 'ADMIN' ? { id: jobId } : { id: jobId, userId: user.id },
    });
  }
}
