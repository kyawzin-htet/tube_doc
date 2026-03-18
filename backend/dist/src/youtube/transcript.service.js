"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TranscriptService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptService = void 0;
const common_1 = require("@nestjs/common");
const youtube_client_service_1 = require("./youtube-client.service");
let TranscriptService = TranscriptService_1 = class TranscriptService {
    youtubeClient;
    logger = new common_1.Logger(TranscriptService_1.name);
    constructor(youtubeClient) {
        this.youtubeClient = youtubeClient;
    }
    async fetchTranscript(videoId) {
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
        }
        catch (error) {
            this.logger.warn(`Could not fetch transcript for video: ${videoId}: ${error.message}`);
            return null;
        }
    }
};
exports.TranscriptService = TranscriptService;
exports.TranscriptService = TranscriptService = TranscriptService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [youtube_client_service_1.YoutubeClientService])
], TranscriptService);
//# sourceMappingURL=transcript.service.js.map