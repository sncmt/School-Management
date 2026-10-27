-- CreateTable
CREATE TABLE "SchoolSlide" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolSlide_schoolId_sortOrder_idx" ON "SchoolSlide"("schoolId", "sortOrder");

-- AddForeignKey
ALTER TABLE "SchoolSlide" ADD CONSTRAINT "SchoolSlide_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
