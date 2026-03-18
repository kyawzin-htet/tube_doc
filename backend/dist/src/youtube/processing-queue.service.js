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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingQueueService = void 0;
const common_1 = require("@nestjs/common");
const account_service_1 = require("../account/account.service");
const prisma_service_1 = require("../prisma/prisma.service");
const youtube_service_1 = require("./youtube.service");
let ProcessingQueueService = class ProcessingQueueService {
    prismaService;
    youtubeService;
    accountService;
    constructor(prismaService, youtubeService, accountService) {
        this.prismaService = prismaService;
        this.youtubeService = youtubeService;
        this.accountService = accountService;
    }
    async enqueue(url, language = 'auto', user) {
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
    async getJobForUser(jobId, user) {
        return this.prismaService.processingJob.findFirst({
            where: user.role === 'ADMIN' ? { id: jobId } : { id: jobId, userId: user.id },
        });
    }
};
exports.ProcessingQueueService = ProcessingQueueService;
exports.ProcessingQueueService = ProcessingQueueService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        youtube_service_1.YoutubeService,
        account_service_1.AccountService])
], ProcessingQueueService);
//# sourceMappingURL=processing-queue.service.js.map