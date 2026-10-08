-- AlterTable
ALTER TABLE "ScheduleOverrideRule" ADD COLUMN     "periodTemplateId" TEXT;

-- AlterTable
ALTER TABLE "SectionYearConfig" ADD COLUMN     "periodTemplateId" TEXT;

-- CreateTable
CREATE TABLE "PeriodTemplate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplatePeriod" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TemplatePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineEntry" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "teacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineEntrySection" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,

    CONSTRAINT "RoutineEntrySection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineSubstitution" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "teacherId" TEXT NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutineSubstitution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PeriodTemplate_schoolId_nameEn_key" ON "PeriodTemplate"("schoolId", "nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "TemplatePeriod_templateId_number_key" ON "TemplatePeriod"("templateId", "number");

-- CreateIndex
CREATE INDEX "RoutineEntry_academicYearId_classId_weekday_idx" ON "RoutineEntry"("academicYearId", "classId", "weekday");

-- CreateIndex
CREATE INDEX "RoutineEntry_teacherId_weekday_idx" ON "RoutineEntry"("teacherId", "weekday");

-- CreateIndex
CREATE INDEX "RoutineEntrySection_sectionId_idx" ON "RoutineEntrySection"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineEntrySection_entryId_sectionId_key" ON "RoutineEntrySection"("entryId", "sectionId");

-- CreateIndex
CREATE INDEX "RoutineSubstitution_teacherId_date_idx" ON "RoutineSubstitution"("teacherId", "date");

-- CreateIndex
CREATE INDEX "RoutineSubstitution_schoolId_date_idx" ON "RoutineSubstitution"("schoolId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineSubstitution_entryId_date_key" ON "RoutineSubstitution"("entryId", "date");

-- AddForeignKey
ALTER TABLE "ScheduleOverrideRule" ADD CONSTRAINT "ScheduleOverrideRule_periodTemplateId_fkey" FOREIGN KEY ("periodTemplateId") REFERENCES "PeriodTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodTemplate" ADD CONSTRAINT "PeriodTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplatePeriod" ADD CONSTRAINT "TemplatePeriod_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PeriodTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineEntry" ADD CONSTRAINT "RoutineEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineEntry" ADD CONSTRAINT "RoutineEntry_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineEntry" ADD CONSTRAINT "RoutineEntry_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineEntry" ADD CONSTRAINT "RoutineEntry_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineEntry" ADD CONSTRAINT "RoutineEntry_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineEntrySection" ADD CONSTRAINT "RoutineEntrySection_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "RoutineEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineEntrySection" ADD CONSTRAINT "RoutineEntrySection_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineSubstitution" ADD CONSTRAINT "RoutineSubstitution_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineSubstitution" ADD CONSTRAINT "RoutineSubstitution_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "RoutineEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineSubstitution" ADD CONSTRAINT "RoutineSubstitution_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionYearConfig" ADD CONSTRAINT "SectionYearConfig_periodTemplateId_fkey" FOREIGN KEY ("periodTemplateId") REFERENCES "PeriodTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

