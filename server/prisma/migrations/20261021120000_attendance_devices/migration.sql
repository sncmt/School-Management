-- CreateTable
CREATE TABLE "AttendanceDevice" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "model" TEXT,
    "firmware" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastIp" TEXT,
    "attlogStamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevicePunch" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "punchedAt" TIMESTAMP(3) NOT NULL,
    "status" INTEGER,
    "verifyType" INTEGER,
    "raw" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevicePunch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceDevice_serialNumber_key" ON "AttendanceDevice"("serialNumber");

-- CreateIndex
CREATE INDEX "AttendanceDevice_schoolId_idx" ON "AttendanceDevice"("schoolId");

-- CreateIndex
CREATE INDEX "DevicePunch_schoolId_punchedAt_idx" ON "DevicePunch"("schoolId", "punchedAt");

-- CreateIndex
CREATE INDEX "DevicePunch_processedAt_idx" ON "DevicePunch"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DevicePunch_deviceId_pin_punchedAt_key" ON "DevicePunch"("deviceId", "pin", "punchedAt");

-- AddForeignKey
ALTER TABLE "AttendanceDevice" ADD CONSTRAINT "AttendanceDevice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevicePunch" ADD CONSTRAINT "DevicePunch_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevicePunch" ADD CONSTRAINT "DevicePunch_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "AttendanceDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

