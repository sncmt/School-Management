-- CreateEnum
CREATE TYPE "MidYearFeeRule" AS ENUM ('FROM_ADMISSION', 'WHOLE_YEAR');

-- DropIndex
DROP INDEX "FeeType_schoolId_name_key";

-- DropIndex
DROP INDEX "Fund_schoolId_name_key";

-- AlterTable
ALTER TABLE "FeeType" DROP COLUMN "name",
ADD COLUMN     "nameBn" TEXT,
ADD COLUMN     "nameEn" TEXT;

-- AlterTable
ALTER TABLE "Fund" DROP COLUMN "name",
ADD COLUMN     "nameBn" TEXT,
ADD COLUMN     "nameEn" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "receiptNo" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "FinanceSetting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "midYearMonthlyFees" "MidYearFeeRule" NOT NULL DEFAULT 'FROM_ADMISSION',
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceSetting_schoolId_key" ON "FinanceSetting"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeType_schoolId_nameEn_key" ON "FeeType"("schoolId", "nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "FeeType_schoolId_nameBn_key" ON "FeeType"("schoolId", "nameBn");

-- CreateIndex
CREATE UNIQUE INDEX "Fund_schoolId_nameEn_key" ON "Fund"("schoolId", "nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "Fund_schoolId_nameBn_key" ON "Fund"("schoolId", "nameBn");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_schoolId_receiptNo_key" ON "Payment"("schoolId", "receiptNo");

-- AddForeignKey
ALTER TABLE "FinanceSetting" ADD CONSTRAINT "FinanceSetting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

