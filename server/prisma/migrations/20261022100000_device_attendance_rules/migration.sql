-- CreateTable
CREATE TABLE "DeviceAttendanceSetting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "lateAfterMinutes" INTEGER NOT NULL DEFAULT 10,
    "studentAbsentAt" TEXT DEFAULT '10:00',
    "teacherStartTime" TEXT NOT NULL DEFAULT '08:00',
    "teacherLateAfterMinutes" INTEGER NOT NULL DEFAULT 10,
    "teacherAbsentAt" TEXT DEFAULT '10:30',
    "checkoutGapMinutes" INTEGER NOT NULL DEFAULT 60,
    "studentAbsentDoneOn" DATE,
    "teacherAbsentDoneOn" DATE,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceAttendanceSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceAttendanceSetting_schoolId_key" ON "DeviceAttendanceSetting"("schoolId");

-- AddForeignKey
ALTER TABLE "DeviceAttendanceSetting" ADD CONSTRAINT "DeviceAttendanceSetting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

