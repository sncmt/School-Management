-- The unused (and empty) SchoolPayment table gives way to subscription payments: monthly or yearly.

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('MONTHLY', 'YEARLY');

-- DropForeignKey
ALTER TABLE "SchoolPayment" DROP CONSTRAINT "SchoolPayment_schoolId_fkey";

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "subscriptionPlan" "SubscriptionPlan";

-- DropTable
DROP TABLE "SchoolPayment";

-- DropEnum
DROP TYPE "SchoolPaymentStatus";

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "period" TEXT NOT NULL,
    "amount" DECIMAL(10,2),
    "paidOn" DATE NOT NULL,
    "note" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionPayment_schoolId_year_idx" ON "SubscriptionPayment"("schoolId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_schoolId_period_key" ON "SubscriptionPayment"("schoolId", "period");

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
