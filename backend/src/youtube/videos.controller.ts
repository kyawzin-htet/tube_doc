import { Controller, Post, Body, Get, Sse, Param, MessageEvent, Delete, Query, ParseIntPipe, DefaultValuePipe, BadRequestException, NotFoundException, Res } from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, map, merge, of } from 'rxjs';
import { ProcessingQueueService } from './processing-queue.service';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('api/videos')
export class VideosController {
  constructor(
    private youtubeService: YoutubeService,
    private eventEmitter: EventEmitter2,
    private processingQueue: ProcessingQueueService,
  ) {}

  @Post('process')
  async process(
    @Body('url') url: string,
    @Body('language') language = 'auto',
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!url) {
      throw new BadRequestException('Missing URL');
    }
    return this.processingQueue.enqueue(url, language, user);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.youtubeService.findAll(user, page, limit);
  }

  @Sse('process/status/:jobId')
  async status(
    @Param('jobId') jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Observable<MessageEvent>> {
    const job = await this.processingQueue.getJobForUser(jobId, user);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const lastStatus = this.youtubeService.getLastStatus(jobId);
    const status$ = fromEvent(this.eventEmitter, `video.status.${jobId}`).pipe(
      map((payload: any) => ({
        data: payload,
      })),
    );
    if (lastStatus) {
      return merge(of({ data: lastStatus }), status$);
    }

    return merge(of({ data: this.buildStatusFromJob(job.id, job.videoId, job) }), status$);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.youtubeService.remove(id, user);
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Query('format') format = 'pdf',
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const video = await this.youtubeService.findById(id, user);
    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const summary = video.summary?.trim();
    if (!summary) {
      throw new BadRequestException('No summary available to download');
    }

    const safeTitle = (video.title || video.videoId || 'summary')
      .replace(/[^\w\-]+/g, '_')
      .slice(0, 80);

    const normalizedFormat = (format || 'pdf').toLowerCase();

    if (normalizedFormat === 'pdf') {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`);
        res.send(buffer);
      });

      doc.fontSize(18).text(video.title || 'TubeDoc Summary', { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666666').text(`Video URL: ${video.videoUrl}`);
      doc.moveDown();
      doc.fillColor('#000000').fontSize(12).text(summary, {
        align: 'left',
      });
      doc.end();
      return;
    }

    if (normalizedFormat === 'docx') {
      const paragraphs = summary
        .split(/\n+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => new Paragraph(line));

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                text: video.title || 'TubeDoc Summary',
                heading: HeadingLevel.TITLE,
              }),
              new Paragraph(`Video URL: ${video.videoUrl}`),
              ...paragraphs,
            ],
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.docx"`);
      res.send(buffer);
      return;
    }

    throw new BadRequestException('Invalid format. Use pdf or docx.');
  }

  private buildStatusFromJob(jobId: string, videoId: string, job: {
    status: string;
    error: string | null;
    progress: number;
    currentChunk: number | null;
    totalChunks: number | null;
    partialSummary: string | null;
  }) {
    if (job.status === 'failed') {
      return {
        jobId,
        videoId,
        status: 'error',
        message: `Job failed: ${job.error ?? 'Unknown error'}`,
        data: {
          progress: job.progress,
          currentChunk: job.currentChunk,
          totalChunks: job.totalChunks,
          partialSummary: job.partialSummary,
        },
      };
    }

    if (job.currentChunk && job.totalChunks) {
      return {
        jobId,
        videoId,
        status: 'partial_summary',
        message: `Processed chunk ${job.currentChunk}/${job.totalChunks}`,
        data: {
          progress: job.progress,
          currentChunk: job.currentChunk,
          totalChunks: job.totalChunks,
          partialSummary: job.partialSummary,
        },
      };
    }

    const message =
      job.status === 'queued' ? 'Job queued. Waiting for a worker...' :
      job.status === 'completed' ? 'Processing complete!' :
      'Processing started...';

    return {
      jobId,
      videoId,
      status: job.status,
      message,
      data: {
        progress: job.progress,
        currentChunk: job.currentChunk,
        totalChunks: job.totalChunks,
        partialSummary: job.partialSummary,
      },
    };
  }
}
