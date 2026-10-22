-- CreateEnum
CREATE TYPE "DeviceCommandStatus" AS ENUM ('PENDING', 'SENT', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "AttendanceDevice" ADD COLUMN     "operlogStamp" TEXT;

-- CreateTable
CREATE TABLE "DevicePerson" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "studentId" TEXT,
    "teacherId" TEXT,
    "cardNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevicePerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceFingerprint" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "fingerIndex" INTEGER NOT NULL,
    "template" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "valid" INTEGER NOT NULL DEFAULT 1,
    "fromDeviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceCommand" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "DeviceCommandStatus" NOT NULL DEFAULT 'PENDING',
    "returnCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "DeviceCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DevicePerson_studentId_key" ON "DevicePerson"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "DevicePerson_teacherId_key" ON "DevicePerson"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "DevicePerson_schoolId_pin_key" ON "DevicePerson"("schoolId", "pin");

-- CreateIndex
CREATE UNIQUE INDEX "DevicePerson_schoolId_cardNumber_key" ON "DevicePerson"("schoolId", "cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceFingerprint_personId_fingerIndex_key" ON "DeviceFingerprint"("personId", "fingerIndex");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCommand_seq_key" ON "DeviceCommand"("seq");

-- CreateIndex
CREATE INDEX "DeviceCommand_deviceId_status_seq_idx" ON "DeviceCommand"("deviceId", "status", "seq");

-- AddForeignKey
ALTER TABLE "DevicePerson" ADD CONSTRAINT "DevicePerson_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevicePerson" ADD CONSTRAINT "DevicePerson_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevicePerson" ADD CONSTRAINT "DevicePerson_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceFingerprint" ADD CONSTRAINT "DeviceFingerprint_personId_fkey" FOREIGN KEY ("personId") REFERENCES "DevicePerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceCommand" ADD CONSTRAINT "DeviceCommand_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "AttendanceDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

