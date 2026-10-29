-- CreateTable
CREATE TABLE "SchoolAbout" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "image" TEXT,
    "facts" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolAbout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryPhoto" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolAbout_schoolId_key" ON "SchoolAbout"("schoolId");

-- CreateIndex
CREATE INDEX "GalleryPhoto_schoolId_sortOrder_idx" ON "GalleryPhoto"("schoolId", "sortOrder");

-- AddForeignKey
ALTER TABLE "SchoolAbout" ADD CONSTRAINT "SchoolAbout_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryPhoto" ADD CONSTRAINT "GalleryPhoto_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
