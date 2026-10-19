-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "admitCardsReleasedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AdmitCardSetting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "rules" TEXT NOT NULL DEFAULT '',
    "signatures" JSONB NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmitCardSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdmitCardSetting_schoolId_key" ON "AdmitCardSetting"("schoolId");

-- AddForeignKey
ALTER TABLE "AdmitCardSetting" ADD CONSTRAINT "AdmitCardSetting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

