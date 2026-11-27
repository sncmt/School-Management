-- AlterEnum
ALTER TYPE "SubjectType" ADD VALUE 'ELECTIVE';

-- CreateTable
CREATE TABLE "StudentMainSubject" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "chosenBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentMainSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectiveRule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "groupId" TEXT,
    "mainCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectiveRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentMainSubject_classSubjectId_idx" ON "StudentMainSubject"("classSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentMainSubject_enrollmentId_classSubjectId_key" ON "StudentMainSubject"("enrollmentId", "classSubjectId");

-- CreateIndex
CREATE INDEX "ElectiveRule_schoolId_idx" ON "ElectiveRule"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectiveRule_academicYearId_classId_groupId_key" ON "ElectiveRule"("academicYearId", "classId", "groupId");

-- AddForeignKey
ALTER TABLE "StudentMainSubject" ADD CONSTRAINT "StudentMainSubject_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMainSubject" ADD CONSTRAINT "StudentMainSubject_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectiveRule" ADD CONSTRAINT "ElectiveRule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectiveRule" ADD CONSTRAINT "ElectiveRule_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectiveRule" ADD CONSTRAINT "ElectiveRule_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectiveRule" ADD CONSTRAINT "ElectiveRule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

