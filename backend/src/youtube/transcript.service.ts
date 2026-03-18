import { Injectable, Logger } from '@nestjs/common';
import { YoutubeClientService } from './youtube-client.service';

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);

  constructor(private youtubeClient: YoutubeClientService) {}

  async fetchTranscript(videoId: string): Promise<string | null> {
    try {
      this.logger.log(`Fetching transcript for video: ${videoId}`);
      const yt = await this.youtubeClient.getClient();
      const info = await yt.getInfo(videoId);
      
      const transcriptData = await info.getTranscript();
      if (!transcriptData || !transcriptData.transcript) {
        return null;
      }

      const segments = transcriptData.transcript.content?.body?.initial_segments;
      if (!segments || !Array.isArray(segments)) {
        return null;
      }

      return segments
        .map((s) => s.snippet?.text || '')
        .filter((text) => text.trim() !== '')
        .join(' ');
    } catch (error) {
      this.logger.warn(`Could not fetch transcript for video: ${videoId}: ${error.message}`);
      return null;
    }
  }
}
