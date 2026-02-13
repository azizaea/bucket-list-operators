-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "booking_notes" TEXT;

-- AlterTable
ALTER TABLE "tours" ADD COLUMN     "exclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "important_notes" TEXT,
ADD COLUMN     "inclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "meeting_point" TEXT,
ADD COLUMN     "meeting_point_instructions" TEXT;
