-- CreateTable
CREATE TABLE "ResultCardSetting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultCardSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamRemark" (
    "id" TEXT NOT NULL,
    "examClassId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "remark" TEXT NOT NULL,
    "writtenBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamRemark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResultCardSetting_schoolId_key" ON "ResultCardSetting"("schoolId");

-- CreateIndex
CREATE INDEX "ExamRemark_enrollmentId_idx" ON "ExamRemark"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamRemark_examClassId_enrollmentId_key" ON "ExamRemark"("examClassId", "enrollmentId");

-- AddForeignKey
ALTER TABLE "ResultCardSetting" ADD CONSTRAINT "ResultCardSetting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRemark" ADD CONSTRAINT "ExamRemark_examClassId_fkey" FOREIGN KEY ("examClassId") REFERENCES "ExamClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRemark" ADD CONSTRAINT "ExamRemark_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
