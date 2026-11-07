
-- AlterTable
ALTER TABLE "School" ADD COLUMN     "packageId" TEXT;

-- CreateTable
CREATE TABLE "SubscriptionPackage" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxStudents" INTEGER,
    "monthlyPrice" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPackage_code_key" ON "SubscriptionPackage"("code");

-- CreateIndex
CREATE INDEX "SubscriptionPackage_isActive_sortOrder_idx" ON "SubscriptionPackage"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "School_packageId_idx" ON "School"("packageId");

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SubscriptionPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

