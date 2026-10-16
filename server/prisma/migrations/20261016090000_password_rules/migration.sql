-- AlterTable
ALTER TABLE "User" DROP COLUMN "mustChangePassword";

-- CreateTable
CREATE TABLE "PasswordChangeCode" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordChangeCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordChangeCode_requestedById_idx" ON "PasswordChangeCode"("requestedById");

-- CreateIndex
CREATE INDEX "PasswordChangeCode_expiresAt_idx" ON "PasswordChangeCode"("expiresAt");

-- AddForeignKey
ALTER TABLE "PasswordChangeCode" ADD CONSTRAINT "PasswordChangeCode_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Guardian and teacher passwords are now changed by the school super admin (with an emailed
-- code), so the old "reset password" permissions go; their role links go with them (cascade)
DELETE FROM "Permission" WHERE "code" IN ('student:reset_password', 'teacher:reset_password');
