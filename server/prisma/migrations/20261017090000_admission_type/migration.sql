-- CreateEnum
CREATE TYPE "AdmissionType" AS ENUM ('NEW', 'OLD');

-- CreateEnum
CREATE TYPE "FeeAppliesTo" AS ENUM ('ALL', 'NEW_STUDENTS', 'OLD_STUDENTS');

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "admissionType" "AdmissionType" NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "FeeType" ADD COLUMN     "appliesTo" "FeeAppliesTo" NOT NULL DEFAULT 'ALL';

