-- CreateEnum
CREATE TYPE "GuideLicenseStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "TourGuideAssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guides" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "operator_id" TEXT,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "license_photo_url" TEXT,
    "license_status" "GuideLicenseStatus" NOT NULL DEFAULT 'NONE',
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" TEXT NOT NULL,
    "bio" TEXT,
    "rating" DECIMAL(3,2),
    "hourly_rate" DECIMAL(10,2),
    "availability" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_guide_assignments" (
    "id" TEXT NOT NULL,
    "tour_id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "status" "TourGuideAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "tour_date" TIMESTAMP(3) NOT NULL,
    "pay_rate" DECIMAL(10,2),
    "notes" TEXT,

    CONSTRAINT "tour_guide_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_itineraries" (
    "id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "destinations" JSONB NOT NULL,
    "estimated_duration" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guide_itineraries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_guide_assignments" ADD CONSTRAINT "tour_guide_assignments_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_guide_assignments" ADD CONSTRAINT "tour_guide_assignments_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_guide_assignments" ADD CONSTRAINT "tour_guide_assignments_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_itineraries" ADD CONSTRAINT "guide_itineraries_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
