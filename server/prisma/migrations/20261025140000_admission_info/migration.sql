-- CreateTable
CREATE TABLE "AdmissionInfo" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dates" JSONB NOT NULL DEFAULT '[]',
    "fees" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionInfo_schoolId_key" ON "AdmissionInfo"("schoolId");

-- AddForeignKey
ALTER TABLE "AdmissionInfo" ADD CONSTRAINT "AdmissionInfo_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
