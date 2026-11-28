-- DropForeignKey
ALTER TABLE "FinalResult" DROP CONSTRAINT "FinalResult_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "FinalResult" DROP CONSTRAINT "FinalResult_formulaId_fkey";

-- DropForeignKey
ALTER TABLE "FinalResult" DROP CONSTRAINT "FinalResult_studentId_fkey";

-- DropForeignKey
ALTER TABLE "FinalResultComponent" DROP CONSTRAINT "FinalResultComponent_formulaId_fkey";

-- DropForeignKey
ALTER TABLE "FinalResultComponentExam" DROP CONSTRAINT "FinalResultComponentExam_componentId_fkey";

-- DropForeignKey
ALTER TABLE "FinalResultComponentExam" DROP CONSTRAINT "FinalResultComponentExam_examId_fkey";

-- DropForeignKey
ALTER TABLE "FinalResultFormula" DROP CONSTRAINT "FinalResultFormula_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "FinalResultFormula" DROP CONSTRAINT "FinalResultFormula_classId_fkey";

-- DropForeignKey
ALTER TABLE "FinalResultFormula" DROP CONSTRAINT "FinalResultFormula_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "FinalResultSubject" DROP CONSTRAINT "FinalResultSubject_resultId_fkey";

-- AlterTable
ALTER TABLE "ExamClass" ADD COLUMN     "isFinal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nameBn" TEXT,
ADD COLUMN     "nameEn" TEXT;

-- DropTable
DROP TABLE "FinalResult";

-- DropTable
DROP TABLE "FinalResultComponent";

-- DropTable
DROP TABLE "FinalResultComponentExam";

-- DropTable
DROP TABLE "FinalResultFormula";

-- DropTable
DROP TABLE "FinalResultSubject";

-- DropEnum
DROP TYPE "FinalComponentMethod";

-- DropEnum
DROP TYPE "FinalResultStatus";

