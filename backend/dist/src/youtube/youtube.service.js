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
var YoutubeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const account_service_1 = require("../account/account.service");
const transcript_service_1 = require("./transcript.service");
const whisper_service_1 = require("./whisper.service");
const summary_service_1 = require("./summary.service");
const prisma_service_1 = require("../prisma/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const youtube_client_service_1 = require("./youtube-client.service");
const gemini_transcription_service_1 = require("./gemini-transcription.service");
let YoutubeService = YoutubeService_1 = class YoutubeService {
    transcriptService;
    whisperService;
    geminiTranscriptionService;
    summaryService;
    accountService;
    prismaService;
    eventEmitter;
    youtubeClient;
    logger = new common_1.Logger(YoutubeService_1.name);
    latestStatusByJobId = new Map();
    summaryInputCostPer1k = Number(process.env.SUMMARY_INPUT_COST_PER_1K_TOKENS ?? 0.00015);
    summaryOutputCostPer1k = Number(process.env.SUMMARY_OUTPUT_COST_PER_1K_TOKENS ?? 0.0006);
    transcriptionInputCostPer1k = Number(process.env.TRANSCRIPTION_INPUT_COST_PER_1K_TOKENS ?? 0.0001);
    transcriptionOutputCostPer1k = Number(process.env.TRANSCRIPTION_OUTPUT_COST_PER_1K_TOKENS ?? 0.0004);
    constructor(transcriptService, whisperService, geminiTranscriptionService, summaryService, accountService, prismaService, eventEmitter, youtubeClient) {
        this.transcriptService = transcriptService;
        this.whisperService = whisperService;
        this.geminiTranscriptionService = geminiTranscriptionService;
        this.summaryService = summaryService;
        this.accountService = accountService;
        this.prismaService = prismaService;
        this.eventEmitter = eventEmitter;
        this.youtubeClient = youtubeClient;
    }
    extractVideoId(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }
    async processVideo(url, language = 'auto', jobId, userId) {
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }
        if (!jobId || !userId) {
            throw new Error('Missing job context');
        }
        this.emitStatus(jobId, videoId, 'fetching_metadata', 'Fetching video metadata...');
        let title = 'Unknown Title';
        try {
            const yt = await this.youtubeClient.getClient();
            const info = await yt.getBasicInfo(videoId);
            title = info.basic_info.title || 'Unknown Title';
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Could not fetch metadata for ${videoId}: ${message}`);
        }
        this.emitStatus(jobId, videoId, 'attempting_transcript', 'Attempting to fetch transcript API...');
        let transcript = await this.transcriptService.fetchTranscript(videoId);
        let method = 'transcript_api';
        let transcriptionInputTokens = 0;
        let transcriptionOutputTokens = 0;
        let summaryInputTokens = 0;
        if (!transcript) {
            const useGemini = this.geminiTranscriptionService.isConfigured();
            this.emitStatus(jobId, videoId, useGemini ? 'switching_to_gemini' : 'switching_to_whisper', useGemini
                ? 'No YouTube transcript found. Switching to Gemini transcription.'
                : 'No YouTube transcript found. Switching to Whisper speech-to-text.');
            try {
                const chunkSummaries = [];
                let partialTranscript = '';
                let totalChunks = 0;
                const transcriptionService = useGemini ? this.geminiTranscriptionService : this.whisperService;
                transcript = await transcriptionService.transcribe(videoId, language, {
                    onStage: (status, message) => this.emitStatus(jobId, videoId, status, message),
                    onChunksReady: async (count) => {
                        totalChunks = count;
                        await this.updateJob(jobId, { totalChunks: count, progress: 0 });
                    },
                    onChunk: async ({ index, total, transcript: chunkText, progress }) => {
                        if (chunkText?.trim()) {
                            partialTranscript = `${partialTranscript} ${chunkText}`.trim();
                        }
                        const chunkSummary = await this.summaryService.summarizeChunk(chunkText, language);
                        if (chunkSummary?.trim()) {
                            chunkSummaries.push(chunkSummary.trim());
                        }
                        const partialSummary = chunkSummaries.join('\n\n');
                        this.emitStatus(jobId, videoId, 'partial_summary', `Processed chunk ${index + 1}/${total}`, {
                            progress,
                            currentChunk: index + 1,
                            totalChunks: total,
                            partialSummary,
                        });
                        await this.updateJob(jobId, {
                            progress,
                            currentChunk: index + 1,
                            totalChunks,
                            partialSummary,
                            partialTranscript,
                        });
                    },
                });
                method = useGemini ? 'gemini' : 'whisper';
                transcriptionOutputTokens = useGemini ? this.estimateTokens(transcript) : 0;
                transcriptionInputTokens = useGemini ? Math.max(1, Math.round(transcriptionOutputTokens * 0.8)) : 0;
                summaryInputTokens = this.summaryService.usesGemini()
                    ? this.estimateTokens(chunkSummaries.length > 0 ? chunkSummaries.join('\n\n') : transcript)
                    : 0;
                if (chunkSummaries.length > 0) {
                    this.emitStatus(jobId, videoId, 'generating_summary', 'Generating final summary from chunks...');
                }
                const finalSummary = await this.summaryService.summarizeFromChunks(chunkSummaries.length > 0 ? chunkSummaries : [transcript], language);
                return this.finalizeVideo({
                    url,
                    videoId,
                    title,
                    transcript,
                    summary: finalSummary,
                    method,
                    jobId,
                    userId,
                    transcriptionInputTokens,
                    transcriptionOutputTokens,
                    summaryInputTokens,
                });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.emitStatus(jobId, videoId, 'error', `${useGemini ? 'Gemini' : 'Whisper'} transcription failed: ${message}`);
                await this.updateJob(jobId, { status: 'failed', error: message, finishedAt: new Date() });
                throw error;
            }
        }
        this.emitStatus(jobId, videoId, 'generating_summary', 'Generating summary...');
        await this.updateJob(jobId, { progress: 70 });
        const summary = await this.summaryService.summarize(transcript, language);
        summaryInputTokens = this.summaryService.usesGemini() ? this.estimateTokens(transcript) : 0;
        return this.finalizeVideo({
            url,
            videoId,
            title,
            transcript,
            summary,
            method,
            jobId,
            userId,
            transcriptionInputTokens,
            transcriptionOutputTokens,
            summaryInputTokens,
        });
    }
    async finalizeVideo(params) {
        const { url, videoId, title, transcript, summary, method, jobId, userId, transcriptionInputTokens, transcriptionOutputTokens, summaryInputTokens, } = params;
        const summaryOutputTokens = this.summaryService.usesGemini()
            ? this.estimateTokens(summary)
            : 0;
        const transcriptCharacters = transcript.length;
        const summaryCharacters = summary.length;
        const totalTokens = transcriptionInputTokens +
            transcriptionOutputTokens +
            summaryInputTokens +
            summaryOutputTokens;
        const estimatedCostUsd = Number(((transcriptionInputTokens / 1000) * this.transcriptionInputCostPer1k +
            (transcriptionOutputTokens / 1000) * this.transcriptionOutputCostPer1k +
            (summaryInputTokens / 1000) * this.summaryInputCostPer1k +
            (summaryOutputTokens / 1000) * this.summaryOutputCostPer1k).toFixed(4));
        this.emitStatus(jobId, videoId, 'saving_to_db', 'Saving to database...');
        await this.updateJob(jobId, { progress: 95 });
        const video = await this.prismaService.youTubeVideo.create({
            data: {
                videoUrl: url,
                videoId,
                title,
                transcript,
                summary,
                processingMethod: method,
                userId,
                jobId,
            },
        });
        await this.updateJob(jobId, {
            status: 'completed',
            finishedAt: new Date(),
            progress: 100,
            videoRecordId: video.id,
            transcriptCharacters,
            summaryCharacters,
            transcriptionInputTokens,
            transcriptionOutputTokens,
            summaryInputTokens,
            summaryOutputTokens,
            totalTokens,
            estimatedCostUsd,
        });
        await this.accountService.recordUsage({
            userId,
            jobId,
            videoId: video.id,
            transcriptCharacters,
            summaryCharacters,
            transcriptionInputTokens,
            transcriptionOutputTokens,
            summaryInputTokens,
            summaryOutputTokens,
            totalTokens,
            estimatedCostUsd,
        });
        this.emitStatus(jobId, videoId, 'completed', 'Processing complete!', video);
        return video;
    }
    async updateJob(jobId, data) {
        if (!jobId)
            return;
        try {
            await this.prismaService.processingJob.update({
                where: { id: jobId },
                data,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Failed to update job ${jobId}: ${message}`);
        }
    }
    emitStatus(jobId, videoId, status, message, data) {
        const payload = {
            jobId,
            videoId,
            status,
            message,
            data,
        };
        this.latestStatusByJobId.set(jobId, payload);
        this.eventEmitter.emit(`video.status.${jobId}`, payload);
        this.logger.log(`[job:${jobId} video:${videoId}] ${status}: ${message}`);
        if (status === 'completed' || status === 'error') {
            setTimeout(() => this.latestStatusByJobId.delete(jobId), 10 * 60 * 1000);
        }
    }
    getLastStatus(jobId) {
        return this.latestStatusByJobId.get(jobId);
    }
    async findAll(user, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const where = user.role === 'ADMIN' ? {} : { userId: user.id };
        const [data, total] = await Promise.all([
            this.prismaService.youTubeVideo.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prismaService.youTubeVideo.count({ where }),
        ]);
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findLatestPublic(limit = 5) {
        return this.prismaService.youTubeVideo.findMany({
            where: {
                summary: {
                    not: '',
                },
            },
            orderBy: { createdAt: 'desc' },
            take: Math.max(1, Math.min(limit, 10)),
        });
    }
    async findById(id, user) {
        const video = await this.prismaService.youTubeVideo.findUnique({
            where: { id },
        });
        if (!video) {
            return null;
        }
        this.assertVideoAccess(video.userId, user.role, user.id);
        return video;
    }
    async remove(id, user) {
        const video = await this.prismaService.youTubeVideo.findUnique({
            where: { id },
        });
        if (!video) {
            throw new common_2.NotFoundException('Video not found');
        }
        this.assertVideoAccess(video.userId, user.role, user.id);
        return this.prismaService.youTubeVideo.delete({
            where: { id },
        });
    }
    assertVideoAccess(ownerUserId, role, currentUserId) {
        if (role === 'ADMIN') {
            return;
        }
        if (ownerUserId !== currentUserId) {
            throw new common_2.ForbiddenException('You do not have access to this video');
        }
    }
    estimateTokens(text) {
        return Math.max(1, Math.ceil((text || '').length / 4));
    }
};
exports.YoutubeService = YoutubeService;
exports.YoutubeService = YoutubeService = YoutubeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transcript_service_1.TranscriptService,
        whisper_service_1.WhisperService,
        gemini_transcription_service_1.GeminiTranscriptionService,
        summary_service_1.SummaryService,
        account_service_1.AccountService,
        prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2,
        youtube_client_service_1.YoutubeClientService])
], YoutubeService);
//# sourceMappingURL=youtube.service.js.map