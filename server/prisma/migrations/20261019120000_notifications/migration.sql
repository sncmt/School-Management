-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('STUDENT_ADMITTED', 'PAYMENT_RECEIVED', 'PAYMENT_CANCELLED', 'STUDENT_ABSENT', 'STUDENT_LATE', 'RESULT_PUBLISHED', 'ADMIT_CARD_RELEASED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT,
    "type" "NotificationType" NOT NULL,
    "data" JSONB NOT NULL,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_schoolId_createdAt_idx" ON "Notification"("userId", "schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_schoolId_readAt_idx" ON "Notification"("userId", "schoolId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_schoolId_dedupeKey_idx" ON "Notification"("schoolId", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
