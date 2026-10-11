/*
  Warnings:

  - Made the column `nameBn` on table `School` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CalendarEntry" ALTER COLUMN "nameEn" DROP NOT NULL,
ALTER COLUMN "nameBn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Exam" ALTER COLUMN "nameEn" DROP NOT NULL,
ALTER COLUMN "nameBn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ExamResultSubject" ALTER COLUMN "nameEn" DROP NOT NULL,
ALTER COLUMN "nameBn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FinalResultComponent" ALTER COLUMN "nameEn" DROP NOT NULL,
ALTER COLUMN "nameBn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FinalResultFormula" ALTER COLUMN "nameEn" DROP NOT NULL,
ALTER COLUMN "nameBn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FinalResultSubject" ALTER COLUMN "nameEn" DROP NOT NULL,
ALTER COLUMN "nameBn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Group" ALTER COLUMN "nameEn" DROP NOT NULL,
ALTER COLUMN "nameBn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PeriodTemplate" ALTER COLUMN "nameEn" DROP NOT NULL,
ALTER COLUMN "nameBn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "School" ALTER COLUMN "nameBn" SET NOT NULL;

-- AlterTable
ALTER TABLE "Subject" ALTER COLUMN "nameEn" DROP NOT NULL,
ALTER COLUMN "nameBn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TemplatePeriod" ALTER COLUMN "nameEn" DROP NOT NULL,
ALTER COLUMN "nameBn" DROP NOT NULL;
