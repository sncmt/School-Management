-- CreateTable
CREATE TABLE "SeatPlan" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "groups" JSONB NOT NULL,
    "generatedBy" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatPlanRoom" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "seats" INTEGER NOT NULL,

    CONSTRAINT "SeatPlanRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seat" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "seatNo" INTEGER NOT NULL,
    "enrollmentId" TEXT NOT NULL,

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeatPlan_examId_key" ON "SeatPlan"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "SeatPlanRoom_planId_roomId_key" ON "SeatPlanRoom"("planId", "roomId");

-- CreateIndex
CREATE INDEX "Seat_roomId_idx" ON "Seat"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_planId_roomId_seatNo_key" ON "Seat"("planId", "roomId", "seatNo");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_planId_enrollmentId_key" ON "Seat"("planId", "enrollmentId");

-- AddForeignKey
ALTER TABLE "SeatPlan" ADD CONSTRAINT "SeatPlan_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatPlanRoom" ADD CONSTRAINT "SeatPlanRoom_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SeatPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatPlanRoom" ADD CONSTRAINT "SeatPlanRoom_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SeatPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

