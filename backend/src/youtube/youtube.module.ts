import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { YoutubeService } from './youtube.service';
import { TranscriptService } from './transcript.service';
import { WhisperService } from './whisper.service';
import { SummaryService } from './summary.service';
import { VideosController } from './videos.controller';
import { YoutubeClientService } from './youtube-client.service';
import { ProcessingQueueService } from './processing-queue.service';
import { ProcessingWorkerService } from './processing-worker.service';
import { GeminiTranscriptionService } from './gemini-transcription.service';

@Module({
  imports: [AccountModule],
  controllers: [VideosController],
  providers: [
    YoutubeService,
    TranscriptService,
    WhisperService,
    GeminiTranscriptionService,
    SummaryService,
    YoutubeClientService,
    ProcessingQueueService,
    ProcessingWorkerService,
  ],
  exports: [YoutubeService],
})
export class YoutubeModule {}
