-- AlterTable
ALTER TABLE "processing_jobs" ADD COLUMN     "currentChunk" INTEGER,
ADD COLUMN     "partialSummary" TEXT,
ADD COLUMN     "partialTranscript" TEXT,
ADD COLUMN     "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalChunks" INTEGER;
