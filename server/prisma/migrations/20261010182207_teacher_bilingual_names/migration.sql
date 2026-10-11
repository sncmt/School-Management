-- A teacher's name in English and Bangla, both required, kept on the school's profile.
-- Existing teachers start with their account name in both; the school corrects the Bangla one.

-- AlterTable
ALTER TABLE "TeacherProfile" ADD COLUMN "nameBn" TEXT,
ADD COLUMN "nameEn" TEXT;

UPDATE "TeacherProfile" AS t
SET "nameEn" = u."fullname", "nameBn" = u."fullname"
FROM "SchoolMembership" AS m
JOIN "User" AS u ON u."id" = m."userId"
WHERE m."id" = t."membershipId";

ALTER TABLE "TeacherProfile" ALTER COLUMN "nameBn" SET NOT NULL,
ALTER COLUMN "nameEn" SET NOT NULL;
