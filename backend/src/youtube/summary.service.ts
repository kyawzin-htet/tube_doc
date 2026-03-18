import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);
  private readonly genAI: GoogleGenerativeAI | null;
  private readonly summaryModel = process.env.GEMINI_SUMMARY_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn('GEMINI_API_KEY not set — falling back to local summarization.');
      this.genAI = null;
    }
  }

  usesGemini() {
    return Boolean(this.genAI);
  }

  async summarize(transcript: string, language = 'auto'): Promise<string> {
    try {
      if (this.genAI) {
        return await this.geminiSummarize(transcript, language);
      }
      this.logger.log('Using local extractive summarization (no Gemini API key).');
      return this.extractiveSummarize(transcript);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Error generating summary:', message);
      this.logger.log('Falling back to local summarization...');
      return this.extractiveSummarize(transcript);
    }
  }

  async summarizeChunk(text: string, language = 'auto'): Promise<string> {
    if (!text || text.trim().length < 50) {
      return text?.trim() || '';
    }
    try {
      if (this.genAI) {
        return await this.geminiSummarizeChunk(text, language);
      }
      return this.extractiveSummarize(text, 4);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Error generating chunk summary:', message);
      return this.extractiveSummarize(text, 4);
    }
  }

  async summarizeFromChunks(chunks: string[], language = 'auto'): Promise<string> {
    const text = chunks.filter(Boolean).join('\n\n');
    if (!text || text.trim().length < 50) {
      return text?.trim() || 'No transcript available.';
    }
    try {
      if (this.genAI) {
        return await this.geminiSummarizeFromChunks(text, language);
      }
      return this.extractiveSummarize(text, 12);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Error generating final summary:', message);
      return this.extractiveSummarize(text, 12);
    }
  }

  private async geminiSummarize(transcript: string, language = 'auto'): Promise<string> {
    this.logger.log(`Generating summary using ${this.summaryModel} (language: ${language})...`);

    const model = this.genAI!.getGenerativeModel({ model: this.summaryModel });

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

  private async geminiSummarizeChunk(text: string, language = 'auto'): Promise<string> {
    this.logger.log(`Generating chunk summary using ${this.summaryModel} (language: ${language})...`);
    const model = this.genAI!.getGenerativeModel({ model: this.summaryModel });

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

  private async geminiSummarizeFromChunks(text: string, language = 'auto'): Promise<string> {
    this.logger.log(`Generating final summary from chunks using ${this.summaryModel} (language: ${language})...`);
    const model = this.genAI!.getGenerativeModel({ model: this.summaryModel });

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

  /**
   * Fallback: Free, local extractive summarization.
   * Used when no Gemini API key is set, or if the Gemini call fails.
   */
  private extractiveSummarize(text: string, maxSentences = 15): string {
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

    const wordFreq: Record<string, number> = {};
    for (const sentence of sentences) {
      const words = sentence.toLowerCase().match(/\b[a-z]+\b/g) || [];
      for (const word of words) {
        if (!stopWords.has(word) && word.length > 2) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      }
    }

    interface ScoredSentence { sentence: string; score: number; idx: number; }
    const scored: ScoredSentence[] = sentences.map((sentence, idx) => {
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
}
