/*
  Warnings:

  - A unique constraint covering the columns `[store_slug]` on the table `guides` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "guide_itineraries" ADD COLUMN     "currency" TEXT DEFAULT 'SAR',
ADD COLUMN     "is_published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "max_guests" INTEGER,
ADD COLUMN     "price" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "guides" ADD COLUMN     "store_slug" TEXT;

-- CreateTable
CREATE TABLE "store_settings" (
    "id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "store_name" TEXT,
    "logo_url" TEXT,
    "primary_color" TEXT DEFAULT '#006C35',
    "hero_image_url" TEXT,
    "about_text" TEXT,
    "tour_selection" TEXT NOT NULL DEFAULT 'ALL',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_domains" (
    "id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "ssl_status" TEXT NOT NULL DEFAULT 'pending',
    "verification_token" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_availability" (
    "id" TEXT NOT NULL,
    "itinerary_id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "max_guests" INTEGER NOT NULL,
    "booked_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guide_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_bookings" (
    "id" TEXT NOT NULL,
    "itinerary_id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "availability_id" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "guest_count" INTEGER NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "moyasar_payment_id" TEXT,
    "confirmation_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guide_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_settings_guide_id_key" ON "store_settings"("guide_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_domains_domain_key" ON "tenant_domains"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "guide_availability_itinerary_id_date_key" ON "guide_availability"("itinerary_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "guide_bookings_confirmation_code_key" ON "guide_bookings"("confirmation_code");

-- CreateIndex
CREATE UNIQUE INDEX "guides_store_slug_key" ON "guides"("store_slug");

-- AddForeignKey
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_domains" ADD CONSTRAINT "tenant_domains_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_availability" ADD CONSTRAINT "guide_availability_itinerary_id_fkey" FOREIGN KEY ("itinerary_id") REFERENCES "guide_itineraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_availability" ADD CONSTRAINT "guide_availability_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_bookings" ADD CONSTRAINT "guide_bookings_itinerary_id_fkey" FOREIGN KEY ("itinerary_id") REFERENCES "guide_itineraries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_bookings" ADD CONSTRAINT "guide_bookings_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_bookings" ADD CONSTRAINT "guide_bookings_availability_id_fkey" FOREIGN KEY ("availability_id") REFERENCES "guide_availability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
