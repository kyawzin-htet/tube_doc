import { YoutubeClientService } from './youtube-client.service';
export declare class TranscriptService {
    private youtubeClient;
    private readonly logger;
    constructor(youtubeClient: YoutubeClientService);
    fetchTranscript(videoId: string): Promise<string | null>;
}
