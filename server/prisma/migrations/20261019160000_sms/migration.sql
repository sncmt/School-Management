-- CreateEnum
CREATE TYPE "SmsProvider" AS ENUM ('TEST');

-- CreateEnum
CREATE TYPE "SmsLanguage" AS ENUM ('BN', 'EN');

-- CreateEnum
CREATE TYPE "SmsEvent" AS ENUM ('STUDENT_ADMITTED', 'PAYMENT_RECEIVED', 'PAYMENT_CANCELLED', 'STUDENT_ABSENT', 'STUDENT_LATE', 'RESULT_PUBLISHED', 'ADMIT_CARD_RELEASED', 'FEE_DUE', 'STUDENT_PROMOTED', 'STUDENT_GRADUATED');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SmsSetting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "provider" "SmsProvider" NOT NULL DEFAULT 'TEST',
    "senderId" TEXT,
    "language" "SmsLanguage" NOT NULL DEFAULT 'BN',
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsTemplate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "event" "SmsEvent" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "bodyBn" TEXT,
    "bodyEn" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT,
    "phone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parts" INTEGER NOT NULL,
    "event" "SmsEvent",
    "dedupeKey" TEXT,
    "status" "SmsStatus" NOT NULL DEFAULT 'QUEUED',
    "sendAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "provider" "SmsProvider",
    "providerRef" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmsSetting_schoolId_key" ON "SmsSetting"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SmsTemplate_schoolId_event_key" ON "SmsTemplate"("schoolId", "event");

-- CreateIndex
CREATE INDEX "SmsMessage_status_sendAfter_idx" ON "SmsMessage"("status", "sendAfter");

-- CreateIndex
CREATE INDEX "SmsMessage_schoolId_createdAt_idx" ON "SmsMessage"("schoolId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SmsMessage_schoolId_dedupeKey_key" ON "SmsMessage"("schoolId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "SmsSetting" ADD CONSTRAINT "SmsSetting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsTemplate" ADD CONSTRAINT "SmsTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
