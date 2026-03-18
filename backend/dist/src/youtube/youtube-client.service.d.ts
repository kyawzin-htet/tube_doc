import { OnModuleInit } from '@nestjs/common';
import { Innertube } from 'youtubei.js';
export declare class YoutubeClientService implements OnModuleInit {
    private readonly logger;
    private yt;
    onModuleInit(): Promise<void>;
    private createClient;
    private setupEvaluator;
    getClient(): Promise<Innertube>;
}
