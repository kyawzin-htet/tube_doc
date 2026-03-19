-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "plan" "UserPlan" NOT NULL DEFAULT 'FREE',
    "dailyTranslationLimit" INTEGER NOT NULL DEFAULT 1,
    "tokenBalance" INTEGER NOT NULL DEFAULT 0,
    "tokenCap" INTEGER NOT NULL DEFAULT 100000,
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "videoId" TEXT,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "translationCount" INTEGER NOT NULL DEFAULT 1,
    "transcriptCharacters" INTEGER NOT NULL DEFAULT 0,
    "summaryCharacters" INTEGER NOT NULL DEFAULT 0,
    "transcriptionInputTokens" INTEGER NOT NULL DEFAULT 0,
    "transcriptionOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "summaryInputTokens" INTEGER NOT NULL DEFAULT 0,
    "summaryOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_usage_pkey" PRIMARY KEY ("id")
);

-- Create legacy owner for existing rows
INSERT INTO "users" (
    "id",
    "email",
    "name",
    "role",
    "plan",
    "dailyTranslationLimit",
    "tokenBalance",
    "tokenCap",
    "isRestricted",
    "createdAt",
    "updatedAt"
)
SELECT
    '00000000-0000-0000-0000-000000000001',
    'legacy@tubedoc.local',
    'Legacy Data',
    'ADMIN',
    'PREMIUM',
    999999,
    0,
    0,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM "users"
    WHERE "email" = 'legacy@tubedoc.local'
);

-- AlterTable
ALTER TABLE "youtube_videos"
    ADD COLUMN "jobId" TEXT,
    ADD COLUMN "userId" TEXT;

-- AlterTable
ALTER TABLE "processing_jobs"
    ADD COLUMN "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "summaryCharacters" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "summaryInputTokens" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "summaryOutputTokens" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "totalTokens" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "transcriptCharacters" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "transcriptionInputTokens" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "transcriptionOutputTokens" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "userId" TEXT;

-- Backfill existing rows
UPDATE "youtube_videos"
SET "userId" = '00000000-0000-0000-0000-000000000001'
WHERE "userId" IS NULL;

UPDATE "processing_jobs"
SET "userId" = '00000000-0000-0000-0000-000000000001'
WHERE "userId" IS NULL;

-- Enforce required ownership
ALTER TABLE "youtube_videos"
    ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "processing_jobs"
    ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_plan_idx" ON "users"("plan");

-- CreateIndex
CREATE INDEX "login_activities_createdAt_idx" ON "login_activities"("createdAt");

-- CreateIndex
CREATE INDEX "login_activities_userId_createdAt_idx" ON "login_activities"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "translation_usage_jobId_key" ON "translation_usage"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "translation_usage_videoId_key" ON "translation_usage"("videoId");

-- CreateIndex
CREATE INDEX "translation_usage_userId_requestDate_idx" ON "translation_usage"("userId", "requestDate");

-- CreateIndex
CREATE INDEX "translation_usage_createdAt_idx" ON "translation_usage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "youtube_videos_jobId_key" ON "youtube_videos"("jobId");

-- CreateIndex
CREATE INDEX "youtube_videos_userId_createdAt_idx" ON "youtube_videos"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "processing_jobs_userId_createdAt_idx" ON "processing_jobs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "youtube_videos" ADD CONSTRAINT "youtube_videos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_videos" ADD CONSTRAINT "youtube_videos_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "processing_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_activities" ADD CONSTRAINT "login_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_usage" ADD CONSTRAINT "translation_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_usage" ADD CONSTRAINT "translation_usage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "processing_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_usage" ADD CONSTRAINT "translation_usage_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "youtube_videos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
