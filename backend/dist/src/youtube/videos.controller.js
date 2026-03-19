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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideosController = void 0;
const common_1 = require("@nestjs/common");
const youtube_service_1 = require("./youtube.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const rxjs_1 = require("rxjs");
const processing_queue_service_1 = require("./processing-queue.service");
const pdfkit_1 = __importDefault(require("pdfkit"));
const docx_1 = require("docx");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const public_decorator_1 = require("../auth/public.decorator");
let VideosController = class VideosController {
    youtubeService;
    eventEmitter;
    processingQueue;
    constructor(youtubeService, eventEmitter, processingQueue) {
        this.youtubeService = youtubeService;
        this.eventEmitter = eventEmitter;
        this.processingQueue = processingQueue;
    }
    async process(url, language = 'auto', user) {
        if (!url) {
            throw new common_1.BadRequestException('Missing URL');
        }
        return this.processingQueue.enqueue(url, language, user);
    }
    async findAll(user, page, limit) {
        return this.youtubeService.findAll(user, page, limit);
    }
    async findLatest(limit) {
        return this.youtubeService.findLatestPublic(limit);
    }
    async status(jobId, user) {
        const job = await this.processingQueue.getJobForUser(jobId, user);
        if (!job) {
            throw new common_1.NotFoundException('Job not found');
        }
        const lastStatus = this.youtubeService.getLastStatus(jobId);
        const status$ = (0, rxjs_1.fromEvent)(this.eventEmitter, `video.status.${jobId}`).pipe((0, rxjs_1.map)((payload) => ({
            data: payload,
        })));
        if (lastStatus) {
            return (0, rxjs_1.merge)((0, rxjs_1.of)({ data: lastStatus }), status$);
        }
        return (0, rxjs_1.merge)((0, rxjs_1.of)({ data: this.buildStatusFromJob(job.id, job.videoId, job) }), status$);
    }
    async remove(id, user) {
        return this.youtubeService.remove(id, user);
    }
    async download(id, format = 'pdf', user, res) {
        const video = await this.youtubeService.findById(id, user);
        if (!video) {
            throw new common_1.NotFoundException('Video not found');
        }
        const summary = video.summary?.trim();
        if (!summary) {
            throw new common_1.BadRequestException('No summary available to download');
        }
        const safeTitle = (video.title || video.videoId || 'summary')
            .replace(/[^\w\-]+/g, '_')
            .slice(0, 80);
        const normalizedFormat = (format || 'pdf').toLowerCase();
        if (normalizedFormat === 'pdf') {
            const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
            const chunks = [];
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
                .map((line) => new docx_1.Paragraph(line));
            const doc = new docx_1.Document({
                sections: [
                    {
                        children: [
                            new docx_1.Paragraph({
                                text: video.title || 'TubeDoc Summary',
                                heading: docx_1.HeadingLevel.TITLE,
                            }),
                            new docx_1.Paragraph(`Video URL: ${video.videoUrl}`),
                            ...paragraphs,
                        ],
                    },
                ],
            });
            const buffer = await docx_1.Packer.toBuffer(doc);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.docx"`);
            res.send(buffer);
            return;
        }
        throw new common_1.BadRequestException('Invalid format. Use pdf or docx.');
    }
    buildStatusFromJob(jobId, videoId, job) {
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
        const message = job.status === 'queued' ? 'Job queued. Waiting for a worker...' :
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
};
exports.VideosController = VideosController;
__decorate([
    (0, common_1.Post)('process'),
    __param(0, (0, common_1.Body)('url')),
    __param(1, (0, common_1.Body)('language')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "process", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(10), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "findAll", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('latest'),
    __param(0, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(5), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "findLatest", null);
__decorate([
    (0, common_1.Sse)('process/status/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "status", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('format')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "download", null);
exports.VideosController = VideosController = __decorate([
    (0, common_1.Controller)('api/videos'),
    __metadata("design:paramtypes", [youtube_service_1.YoutubeService,
        event_emitter_1.EventEmitter2,
        processing_queue_service_1.ProcessingQueueService])
], VideosController);
//# sourceMappingURL=videos.controller.js.map