-- CreateTable
CREATE TABLE "youtube_videos" (
    "id" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT,
    "transcript" TEXT,
    "summary" TEXT,
    "processingMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "youtube_videos_pkey" PRIMARY KEY ("id")
);
