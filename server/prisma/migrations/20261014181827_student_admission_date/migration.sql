-- The day each student joined the school. Existing students get the day of their earliest
-- enrollment (in Bangladesh time), or else the day their record was created.

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "admissionDate" DATE;

UPDATE "Student" AS s
SET "admissionDate" = COALESCE(
  (SELECT MIN((e."enrolledAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Dhaka')::date) FROM "Enrollment" AS e WHERE e."studentId" = s."id"),
  (s."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Dhaka')::date
);

ALTER TABLE "Student" ALTER COLUMN "admissionDate" SET NOT NULL;
