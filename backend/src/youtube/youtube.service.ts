import { Injectable, Logger } from '@nestjs/common';
import type { UserRole } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private readonly latestStatusByJobId = new Map<string, StatusPayload>();
  private readonly summaryInputCostPer1k = Number(
    process.env.SUMMARY_INPUT_COST_PER_1K_TOKENS ?? 0.00015,
  );
  private readonly summaryOutputCostPer1k = Number(
    process.env.SUMMARY_OUTPUT_COST_PER_1K_TOKENS ?? 0.0006,
  );
  private readonly transcriptionInputCostPer1k = Number(
    process.env.TRANSCRIPTION_INPUT_COST_PER_1K_TOKENS ?? 0.0001,
  );
  private readonly transcriptionOutputCostPer1k = Number(
    process.env.TRANSCRIPTION_OUTPUT_COST_PER_1K_TOKENS ?? 0.0004,
  );

  constructor(
    private transcriptService: TranscriptService,
    private whisperService: WhisperService,
    private geminiTranscriptionService: GeminiTranscriptionService,
    private summaryService: SummaryService,
    private accountService: AccountService,
    private prismaService: PrismaService,
    private eventEmitter: EventEmitter2,
    private youtubeClient: YoutubeClientService,
  ) {}

  extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  async processVideo(url: string, language = 'auto', jobId?: string, userId?: string) {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }
    if (!jobId || !userId) {
      throw new Error('Missing job context');
    }

    this.emitStatus(jobId, videoId, 'fetching_metadata', 'Fetching video metadata...');
    
    let title = 'Unknown Title';
    try {
      const yt = await this.youtubeClient.getClient();
      const info = await yt.getBasicInfo(videoId);
      title = info.basic_info.title || 'Unknown Title';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not fetch metadata for ${videoId}: ${message}`);
    }

    this.emitStatus(jobId, videoId, 'attempting_transcript', 'Attempting to fetch transcript API...');
    
    let transcript = await this.transcriptService.fetchTranscript(videoId);
    let method = 'transcript_api';
    let transcriptionInputTokens = 0;
    let transcriptionOutputTokens = 0;
    let summaryInputTokens = 0;

    if (!transcript) {
      const useGemini = this.geminiTranscriptionService.isConfigured();
      this.emitStatus(
        jobId,
        videoId,
        useGemini ? 'switching_to_gemini' : 'switching_to_whisper',
        useGemini
          ? 'No YouTube transcript found. Switching to Gemini transcription.'
          : 'No YouTube transcript found. Switching to Whisper speech-to-text.',
      );
      try {
        const chunkSummaries: string[] = [];
        let partialTranscript = '';
        let totalChunks = 0;

        const transcriptionService = useGemini ? this.geminiTranscriptionService : this.whisperService;
        transcript = await transcriptionService.transcribe(
          videoId,
          language,
          {
            onStage: (status, message) => this.emitStatus(jobId, videoId, status, message),
            onChunksReady: async (count) => {
              totalChunks = count;
              await this.updateJob(jobId, { totalChunks: count, progress: 0 });
            },
            onChunk: async ({ index, total, transcript: chunkText, progress }) => {
              if (chunkText?.trim()) {
                partialTranscript = `${partialTranscript} ${chunkText}`.trim();
              }

              const chunkSummary = await this.summaryService.summarizeChunk(chunkText, language);
              if (chunkSummary?.trim()) {
                chunkSummaries.push(chunkSummary.trim());
              }

              const partialSummary = chunkSummaries.join('\n\n');
              this.emitStatus(
                jobId,
                videoId,
                'partial_summary',
                `Processed chunk ${index + 1}/${total}`,
                {
                  progress,
                  currentChunk: index + 1,
                  totalChunks: total,
                  partialSummary,
                },
              );

              await this.updateJob(jobId, {
                progress,
                currentChunk: index + 1,
                totalChunks,
                partialSummary,
                partialTranscript,
              });
            },
          },
        );
        method = useGemini ? 'gemini' : 'whisper';
        transcriptionOutputTokens = useGemini ? this.estimateTokens(transcript) : 0;
        transcriptionInputTokens = useGemini ? Math.max(1, Math.round(transcriptionOutputTokens * 0.8)) : 0;
        summaryInputTokens = this.summaryService.usesGemini()
          ? this.estimateTokens(
              chunkSummaries.length > 0 ? chunkSummaries.join('\n\n') : transcript,
            )
          : 0;

        if (chunkSummaries.length > 0) {
          this.emitStatus(jobId, videoId, 'generating_summary', 'Generating final summary from chunks...');
        }
        const finalSummary = await this.summaryService.summarizeFromChunks(
          chunkSummaries.length > 0 ? chunkSummaries : [transcript],
          language,
        );
        return this.finalizeVideo({
          url,
          videoId,
          title,
          transcript,
          summary: finalSummary,
          method,
          jobId,
          userId,
          transcriptionInputTokens,
          transcriptionOutputTokens,
          summaryInputTokens,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.emitStatus(
          jobId,
          videoId,
          'error',
          `${useGemini ? 'Gemini' : 'Whisper'} transcription failed: ${message}`,
        );
        await this.updateJob(jobId, { status: 'failed', error: message, finishedAt: new Date() });
        throw error;
      }
    }

    this.emitStatus(jobId, videoId, 'generating_summary', 'Generating summary...');
    await this.updateJob(jobId, { progress: 70 });
    const summary = await this.summaryService.summarize(transcript, language);
    summaryInputTokens = this.summaryService.usesGemini() ? this.estimateTokens(transcript) : 0;

    return this.finalizeVideo({
      url,
      videoId,
      title,
      transcript,
      summary,
      method,
      jobId,
      userId,
      transcriptionInputTokens,
      transcriptionOutputTokens,
      summaryInputTokens,
    });
  }

  private async finalizeVideo(params: {
    url: string;
    videoId: string;
    title: string;
    transcript: string;
    summary: string;
    method: string;
    jobId: string;
    userId: string;
    transcriptionInputTokens: number;
    transcriptionOutputTokens: number;
    summaryInputTokens: number;
  }) {
    const {
      url,
      videoId,
      title,
      transcript,
      summary,
      method,
      jobId,
      userId,
      transcriptionInputTokens,
      transcriptionOutputTokens,
      summaryInputTokens,
    } = params;
    const summaryOutputTokens = this.summaryService.usesGemini()
      ? this.estimateTokens(summary)
      : 0;
    const transcriptCharacters = transcript.length;
    const summaryCharacters = summary.length;
    const totalTokens =
      transcriptionInputTokens +
      transcriptionOutputTokens +
      summaryInputTokens +
      summaryOutputTokens;
    const estimatedCostUsd = Number(
      (
        (transcriptionInputTokens / 1000) * this.transcriptionInputCostPer1k +
        (transcriptionOutputTokens / 1000) * this.transcriptionOutputCostPer1k +
        (summaryInputTokens / 1000) * this.summaryInputCostPer1k +
        (summaryOutputTokens / 1000) * this.summaryOutputCostPer1k
      ).toFixed(4),
    );

    this.emitStatus(jobId, videoId, 'saving_to_db', 'Saving to database...');
    await this.updateJob(jobId, { progress: 95 });
    const video = await this.prismaService.youTubeVideo.create({
      data: {
        videoUrl: url,
        videoId,
        title,
        transcript,
        summary,
        processingMethod: method,
        userId,
        jobId,
      },
    });

    await this.updateJob(jobId, {
      status: 'completed',
      finishedAt: new Date(),
      progress: 100,
      videoRecordId: video.id,
      transcriptCharacters,
      summaryCharacters,
      transcriptionInputTokens,
      transcriptionOutputTokens,
      summaryInputTokens,
      summaryOutputTokens,
      totalTokens,
      estimatedCostUsd,
    });
    await this.accountService.recordUsage({
      userId,
      jobId,
      videoId: video.id,
      transcriptCharacters,
      summaryCharacters,
      transcriptionInputTokens,
      transcriptionOutputTokens,
      summaryInputTokens,
      summaryOutputTokens,
      totalTokens,
      estimatedCostUsd,
    });
    this.emitStatus(jobId, videoId, 'completed', 'Processing complete!', video);
    return video;
  }

  private async updateJob(jobId: string | undefined, data: Record<string, any>) {
    if (!jobId) return;
    try {
      await this.prismaService.processingJob.update({
        where: { id: jobId },
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to update job ${jobId}: ${message}`);
    }
  }

  emitStatus(jobId: string, videoId: string, status: string, message: string, data?: unknown) {
    const payload = {
      jobId,
      videoId,
      status,
      message,
      data,
    };
    this.latestStatusByJobId.set(jobId, payload);
    this.eventEmitter.emit(`video.status.${jobId}`, payload);
    this.logger.log(`[job:${jobId} video:${videoId}] ${status}: ${message}`);

    if (status === 'completed' || status === 'error') {
      setTimeout(() => this.latestStatusByJobId.delete(jobId), 10 * 60 * 1000);
    }
  }

  getLastStatus(jobId: string) {
    return this.latestStatusByJobId.get(jobId);
  }

  async findAll(user: AuthenticatedUser, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where = user.role === 'ADMIN' ? {} : { userId: user.id };
    const [data, total] = await Promise.all([
      this.prismaService.youTubeVideo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaService.youTubeVideo.count({ where }),
    ]);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findLatestPublic(limit = 5) {
    return this.prismaService.youTubeVideo.findMany({
      where: {
        summary: {
          not: '',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, Math.min(limit, 10)),
    });
  }

  async findById(id: string, user: AuthenticatedUser) {
    const video = await this.prismaService.youTubeVideo.findUnique({
      where: { id },
    });
    if (!video) {
      return null;
    }

    this.assertVideoAccess(video.userId, user.role, user.id);
    return video;
  }

  async remove(id: string, user: AuthenticatedUser) {
    const video = await this.prismaService.youTubeVideo.findUnique({
      where: { id },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    this.assertVideoAccess(video.userId, user.role, user.id);
    return this.prismaService.youTubeVideo.delete({
      where: { id },
    });
  }

  private assertVideoAccess(ownerUserId: string, role: UserRole, currentUserId: string) {
    if (role === 'ADMIN') {
      return;
    }

    if (ownerUserId !== currentUserId) {
      throw new ForbiddenException('You do not have access to this video');
    }
  }

  private estimateTokens(text: string) {
    return Math.max(1, Math.ceil((text || '').length / 4));
  }
}
