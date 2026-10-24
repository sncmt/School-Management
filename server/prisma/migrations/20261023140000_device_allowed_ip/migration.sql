-- AlterTable
ALTER TABLE "AttendanceDevice" ADD COLUMN     "allowedIp" TEXT,
ADD COLUMN     "lastRefusedAt" TIMESTAMP(3),
ADD COLUMN     "lastRefusedIp" TEXT;
