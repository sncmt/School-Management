-- CreateEnum
CREATE TYPE "HomeworkCheckStatus" AS ENUM ('DONE', 'LATE', 'NOT_DONE', 'EXCUSED');

-- CreateTable
CREATE TABLE "Homework" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL DEFAULT '',
    "assignedOn" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "fullMarks" DECIMAL(6,2),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkSection" (
    "id" TEXT NOT NULL,
    "homeworkId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,

    CONSTRAINT "HomeworkSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkAttachment" (
    "id" TEXT NOT NULL,
    "homeworkId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeworkAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkCheck" (
    "id" TEXT NOT NULL,
    "homeworkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "status" "HomeworkCheckStatus" NOT NULL,
    "marks" DECIMAL(6,2),
    "comment" TEXT,
    "checkedBy" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeworkCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Homework_schoolId_academicYearId_dueDate_idx" ON "Homework"("schoolId", "academicYearId", "dueDate");

-- CreateIndex
CREATE INDEX "Homework_classSubjectId_idx" ON "Homework"("classSubjectId");

-- CreateIndex
CREATE INDEX "HomeworkSection_sectionId_idx" ON "HomeworkSection"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkSection_homeworkId_sectionId_key" ON "HomeworkSection"("homeworkId", "sectionId");

-- CreateIndex
CREATE INDEX "HomeworkAttachment_homeworkId_idx" ON "HomeworkAttachment"("homeworkId");

-- CreateIndex
CREATE INDEX "HomeworkCheck_studentId_idx" ON "HomeworkCheck"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkCheck_homeworkId_enrollmentId_key" ON "HomeworkCheck"("homeworkId", "enrollmentId");

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSection" ADD CONSTRAINT "HomeworkSection_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSection" ADD CONSTRAINT "HomeworkSection_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAttachment" ADD CONSTRAINT "HomeworkAttachment_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkCheck" ADD CONSTRAINT "HomeworkCheck_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkCheck" ADD CONSTRAINT "HomeworkCheck_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkCheck" ADD CONSTRAINT "HomeworkCheck_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

