-- CreateEnum
CREATE TYPE "OnlinePaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'ONLINE';

-- CreateTable
CREATE TABLE "OnlinePayment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tranId" TEXT NOT NULL,
    "feeIds" JSONB NOT NULL,
    "feeAmount" DECIMAL(10,2) NOT NULL,
    "charge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "status" "OnlinePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "sandbox" BOOLEAN NOT NULL,
    "sessionKey" TEXT,
    "valId" TEXT,
    "bankTranId" TEXT,
    "cardType" TEXT,
    "storeAmount" DECIMAL(10,2),
    "failReason" TEXT,
    "paymentId" TEXT,
    "refundAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "refundedAt" TIMESTAMP(3),
    "refundNote" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlinePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnlinePayment_tranId_key" ON "OnlinePayment"("tranId");

-- CreateIndex
CREATE UNIQUE INDEX "OnlinePayment_paymentId_key" ON "OnlinePayment"("paymentId");

-- CreateIndex
CREATE INDEX "OnlinePayment_schoolId_status_createdAt_idx" ON "OnlinePayment"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "OnlinePayment_studentId_idx" ON "OnlinePayment"("studentId");

-- AddForeignKey
ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

