-- CreateTable
CREATE TABLE "IdCardSetting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdCardSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdCardSetting_schoolId_key" ON "IdCardSetting"("schoolId");

-- AddForeignKey
ALTER TABLE "IdCardSetting" ADD CONSTRAINT "IdCardSetting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

