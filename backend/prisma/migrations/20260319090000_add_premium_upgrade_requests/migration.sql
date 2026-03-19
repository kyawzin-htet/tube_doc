-- CreateEnum
CREATE TYPE "UpgradeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'CANCELED');

-- CreateTable
CREATE TABLE "premium_upgrade_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "status" "UpgradeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedPlan" "UserPlan" NOT NULL DEFAULT 'PREMIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "premium_upgrade_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "premium_upgrade_requests_userId_createdAt_idx" ON "premium_upgrade_requests"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "premium_upgrade_requests_status_createdAt_idx" ON "premium_upgrade_requests"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "premium_upgrade_requests" ADD CONSTRAINT "premium_upgrade_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_upgrade_requests" ADD CONSTRAINT "premium_upgrade_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
