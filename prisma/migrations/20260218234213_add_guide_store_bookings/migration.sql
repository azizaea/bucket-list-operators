-- CreateTable
CREATE TABLE "guide_store_bookings" (
    "id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "tour_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tour_date" TIMESTAMP(3) NOT NULL,
    "guests" INTEGER NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "nationality" TEXT,
    "passport_number" TEXT,
    "country_of_residence" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "food_allergies" TEXT,
    "medical_conditions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guide_store_bookings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "guide_store_bookings" ADD CONSTRAINT "guide_store_bookings_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_store_bookings" ADD CONSTRAINT "guide_store_bookings_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "guide_itineraries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
