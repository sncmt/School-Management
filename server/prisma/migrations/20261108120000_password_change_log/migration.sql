
-- CreateEnum
CREATE TYPE "PasswordChangeSource" AS ENUM ('PLATFORM', 'SCHOOL_SUPER_ADMIN');

-- CreateTable
CREATE TABLE "PasswordChangeLog" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "schoolId" TEXT,
    "source" "PasswordChangeSource" NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedByName" TEXT NOT NULL,
    "generated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordChangeLog_schoolId_createdAt_idx" ON "PasswordChangeLog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "PasswordChangeLog_targetUserId_idx" ON "PasswordChangeLog"("targetUserId");

