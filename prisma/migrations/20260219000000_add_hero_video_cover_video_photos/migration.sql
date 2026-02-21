-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN "hero_video_url" TEXT;

-- AlterTable
ALTER TABLE "guide_itineraries" ADD COLUMN "cover_video_url" TEXT,
ADD COLUMN "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
