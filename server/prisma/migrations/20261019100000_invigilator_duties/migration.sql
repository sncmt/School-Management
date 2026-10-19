-- AlterTable
ALTER TABLE "SeatPlan" ADD COLUMN     "invigilatorsPerRoom" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "InvigilatorDuty" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '',
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvigilatorDuty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvigilatorDuty_planId_date_idx" ON "InvigilatorDuty"("planId", "date");

-- CreateIndex
CREATE INDEX "InvigilatorDuty_teacherId_date_idx" ON "InvigilatorDuty"("teacherId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "InvigilatorDuty_planId_date_startTime_teacherId_key" ON "InvigilatorDuty"("planId", "date", "startTime", "teacherId");

-- AddForeignKey
ALTER TABLE "InvigilatorDuty" ADD CONSTRAINT "InvigilatorDuty_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SeatPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvigilatorDuty" ADD CONSTRAINT "InvigilatorDuty_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvigilatorDuty" ADD CONSTRAINT "InvigilatorDuty_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
