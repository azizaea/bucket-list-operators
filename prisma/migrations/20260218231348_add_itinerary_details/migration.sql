-- AlterTable
ALTER TABLE "guide_itineraries" ADD COLUMN     "cover_image" TEXT,
ADD COLUMN     "excludes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "includes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "itinerary_days" JSONB;
