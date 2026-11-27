-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('SCHOOL', 'COLLEGE', 'SCHOOL_AND_COLLEGE');

-- CreateEnum
CREATE TYPE "AcademicTrack" AS ENUM ('SCHOOL', 'COLLEGE');

-- AlterTable
ALTER TABLE "AcademicYear" ADD COLUMN     "track" "AcademicTrack" NOT NULL DEFAULT 'SCHOOL';

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "institutionType" "InstitutionType" NOT NULL DEFAULT 'SCHOOL';

-- AlterTable
ALTER TABLE "SchoolClass" ADD COLUMN     "track" "AcademicTrack" NOT NULL DEFAULT 'SCHOOL';

-- CreateIndex
CREATE INDEX "AcademicYear_schoolId_track_isCurrent_idx" ON "AcademicYear"("schoolId", "track", "isCurrent");

