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
var SummaryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummaryService = void 0;
const common_1 = require("@nestjs/common");
const generative_ai_1 = require("@google/generative-ai");
let SummaryService = SummaryService_1 = class SummaryService {
    logger = new common_1.Logger(SummaryService_1.name);
    genAI;
    summaryModel = process.env.GEMINI_SUMMARY_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        }
        else {
            this.logger.warn('GEMINI_API_KEY not set — falling back to local summarization.');
            this.genAI = null;
        }
    }
    usesGemini() {
        return Boolean(this.genAI);
    }
    async summarize(transcript, language = 'auto') {
        try {
            if (this.genAI) {
                return await this.geminiSummarize(transcript, language);
            }
            this.logger.log('Using local extractive summarization (no Gemini API key).');
            return this.extractiveSummarize(transcript);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error('Error generating summary:', message);
            this.logger.log('Falling back to local summarization...');
            return this.extractiveSummarize(transcript);
        }
    }
    async summarizeChunk(text, language = 'auto') {
        if (!text || text.trim().length < 50) {
            return text?.trim() || '';
        }
        try {
            if (this.genAI) {
                return await this.geminiSummarizeChunk(text, language);
            }
            return this.extractiveSummarize(text, 4);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error('Error generating chunk summary:', message);
            return this.extractiveSummarize(text, 4);
        }
    }
    async summarizeFromChunks(chunks, language = 'auto') {
        const text = chunks.filter(Boolean).join('\n\n');
        if (!text || text.trim().length < 50) {
            return text?.trim() || 'No transcript available.';
        }
        try {
            if (this.genAI) {
                return await this.geminiSummarizeFromChunks(text, language);
            }
            return this.extractiveSummarize(text, 12);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error('Error generating final summary:', message);
            return this.extractiveSummarize(text, 12);
        }
    }
    async geminiSummarize(transcript, language = 'auto') {
        this.logger.log(`Generating summary using ${this.summaryModel} (language: ${language})...`);
        const model = this.genAI.getGenerativeModel({ model: this.summaryModel });
        const languageInstruction = language && language !== 'auto'
            ? `Write the entire summary in the same language as the transcript (language code: ${language}). Do NOT translate to English.`
            : 'Write the summary in the same language as the transcript.';
        const prompt = `You are an expert summarizer. Given the following transcript from a YouTube video, produce a clear, well-structured, and comprehensive summary.

The summary should:
- Be written in clear, flowing prose (not bullet points)
- Cover the main topics, key insights, and important points from the video
- Be roughly 3-5 paragraphs long, depending on the length and complexity of the content
- Omit filler words, repetition, and off-topic tangents
- Be written for someone who has NOT watched the video
- ${languageInstruction}

Transcript:
"""
${transcript.slice(0, 30000)}
"""

Summary:`;
        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text().trim();
    }
    async geminiSummarizeChunk(text, language = 'auto') {
        this.logger.log(`Generating chunk summary using ${this.summaryModel} (language: ${language})...`);
        const model = this.genAI.getGenerativeModel({ model: this.summaryModel });
        const languageInstruction = language && language !== 'auto'
            ? `Write the entire summary in the same language as the transcript (language code: ${language}). Do NOT translate to English.`
            : 'Write the summary in the same language as the transcript.';
        const prompt = `You are summarizing a chunk of a longer transcript.
Write a concise summary in 3-5 sentences.
- Focus on key facts and ideas
- Avoid repetition
- ${languageInstruction}

Chunk:
"""
${text.slice(0, 12000)}
"""

Summary:`;
        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text().trim();
    }
    async geminiSummarizeFromChunks(text, language = 'auto') {
        this.logger.log(`Generating final summary from chunks using ${this.summaryModel} (language: ${language})...`);
        const model = this.genAI.getGenerativeModel({ model: this.summaryModel });
        const languageInstruction = language && language !== 'auto'
            ? `Write the entire summary in the same language as the transcript (language code: ${language}). Do NOT translate to English.`
            : 'Write the summary in the same language as the transcript.';
        const prompt = `You are an expert summarizer. Given multiple chunk summaries from a long video,
produce a clear, well-structured final summary.
- 3-5 paragraphs of flowing prose
- Cover all major points without repetition
- ${languageInstruction}

Chunk summaries:
"""
${text.slice(0, 30000)}
"""

Final Summary:`;
        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text().trim();
    }
    extractiveSummarize(text, maxSentences = 15) {
        if (!text || text.trim().length < 50) {
            return text?.trim() || 'No transcript available.';
        }
        const sentences = text
            .replace(/([.?!])\s+/g, '$1\n')
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 20);
        if (sentences.length <= maxSentences) {
            return sentences.join(' ');
        }
        const stopWords = new Set([
            'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
            'for', 'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were',
            'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'that', 'this',
            'it', 'its', 'we', 'you', 'he', 'she', 'they', 'i', 'me', 'my',
            'so', 'if', 'as', 'not', 'no', 'up', 'out', 'can', 'just', 'also',
        ]);
        const wordFreq = {};
        for (const sentence of sentences) {
            const words = sentence.toLowerCase().match(/\b[a-z]+\b/g) || [];
            for (const word of words) {
                if (!stopWords.has(word) && word.length > 2) {
                    wordFreq[word] = (wordFreq[word] || 0) + 1;
                }
            }
        }
        const scored = sentences.map((sentence, idx) => {
            const words = sentence.toLowerCase().match(/\b[a-z]+\b/g) ?? [];
            let score = 0;
            for (const w of words) {
                score += (wordFreq[w] ?? 0);
            }
            return { sentence, score, idx };
        });
        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, maxSentences)
            .sort((a, b) => a.idx - b.idx)
            .map(s => s.sentence)
            .join(' ');
    }
};
exports.SummaryService = SummaryService;
exports.SummaryService = SummaryService = SummaryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SummaryService);
//# sourceMappingURL=summary.service.js.map