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
var ProcessingWorkerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingWorkerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const youtube_service_1 = require("./youtube.service");
let ProcessingWorkerService = ProcessingWorkerService_1 = class ProcessingWorkerService {
    prismaService;
    youtubeService;
    logger = new common_1.Logger(ProcessingWorkerService_1.name);
    timer = null;
    active = 0;
    pollIntervalMs = Number(process.env.JOB_POLL_INTERVAL_MS ?? 2000);
    concurrency = Math.max(1, Number(process.env.JOB_CONCURRENCY ?? 1));
    constructor(prismaService, youtubeService) {
        this.prismaService = prismaService;
        this.youtubeService = youtubeService;
    }
    onModuleInit() {
        this.timer = setInterval(() => this.tick(), this.pollIntervalMs);
        this.tick();
        this.logger.log(`Queue worker started (interval ${this.pollIntervalMs}ms, concurrency ${this.concurrency})`);
    }
    onModuleDestroy() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    async tick() {
        if (this.active >= this.concurrency)
            return;
        this.active += 1;
        try {
            await this.processNext();
        }
        finally {
            this.active -= 1;
        }
    }
    async processNext() {
        const job = await this.prismaService.processingJob.findFirst({
            where: { status: 'queued' },
            orderBy: { createdAt: 'asc' },
        });
        if (!job)
            return;
        const claimed = await this.prismaService.processingJob.updateMany({
            where: { id: job.id, status: 'queued' },
            data: {
                status: 'running',
                startedAt: new Date(),
                attempts: { increment: 1 },
                progress: 0,
            },
        });
        if (claimed.count === 0)
            return;
        this.youtubeService.emitStatus(job.id, job.videoId, 'processing_started', 'Processing started...');
        try {
            await this.youtubeService.processVideo(job.videoUrl, job.language, job.id, job.userId);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await this.prismaService.processingJob.update({
                where: { id: job.id },
                data: {
                    status: 'failed',
                    finishedAt: new Date(),
                    error: message,
                },
            });
        }
    }
};
exports.ProcessingWorkerService = ProcessingWorkerService;
exports.ProcessingWorkerService = ProcessingWorkerService = ProcessingWorkerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        youtube_service_1.YoutubeService])
], ProcessingWorkerService);
//# sourceMappingURL=processing-worker.service.js.map