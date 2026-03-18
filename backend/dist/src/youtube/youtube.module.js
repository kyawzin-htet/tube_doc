"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeModule = void 0;
const common_1 = require("@nestjs/common");
const account_module_1 = require("../account/account.module");
const youtube_service_1 = require("./youtube.service");
const transcript_service_1 = require("./transcript.service");
const whisper_service_1 = require("./whisper.service");
const summary_service_1 = require("./summary.service");
const videos_controller_1 = require("./videos.controller");
const youtube_client_service_1 = require("./youtube-client.service");
const processing_queue_service_1 = require("./processing-queue.service");
const processing_worker_service_1 = require("./processing-worker.service");
const gemini_transcription_service_1 = require("./gemini-transcription.service");
let YoutubeModule = class YoutubeModule {
};
exports.YoutubeModule = YoutubeModule;
exports.YoutubeModule = YoutubeModule = __decorate([
    (0, common_1.Module)({
        imports: [account_module_1.AccountModule],
        controllers: [videos_controller_1.VideosController],
        providers: [
            youtube_service_1.YoutubeService,
            transcript_service_1.TranscriptService,
            whisper_service_1.WhisperService,
            gemini_transcription_service_1.GeminiTranscriptionService,
            summary_service_1.SummaryService,
            youtube_client_service_1.YoutubeClientService,
            processing_queue_service_1.ProcessingQueueService,
            processing_worker_service_1.ProcessingWorkerService,
        ],
        exports: [youtube_service_1.YoutubeService],
    })
], YoutubeModule);
//# sourceMappingURL=youtube.module.js.map