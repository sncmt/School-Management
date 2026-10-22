-- CreateTable
CREATE TABLE "OnlinePaymentSetting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sandbox" BOOLEAN NOT NULL DEFAULT true,
    "storeId" TEXT,
    "storePassword" TEXT,
    "chargePercent" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "lastTestAt" TIMESTAMP(3),
    "lastTestOk" BOOLEAN,
    "lastTestMessage" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlinePaymentSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnlinePaymentSetting_schoolId_key" ON "OnlinePaymentSetting"("schoolId");

-- AddForeignKey
ALTER TABLE "OnlinePaymentSetting" ADD CONSTRAINT "OnlinePaymentSetting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

