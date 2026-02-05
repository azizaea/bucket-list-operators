-- CreateTable
CREATE TABLE "operators" (
    "id" TEXT NOT NULL,
    "company_name_ar" TEXT NOT NULL,
    "company_name_en" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "subscription_plan" TEXT NOT NULL DEFAULT 'starter',
    "subscription_status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_users" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tours" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "title_ar" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "description_ar" TEXT,
    "description_en" TEXT,
    "duration_hours" INTEGER NOT NULL,
    "max_capacity" INTEGER NOT NULL,
    "base_price_sar" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_schedules" (
    "id" TEXT NOT NULL,
    "tour_id" TEXT NOT NULL,
    "departure_datetime" TIMESTAMP(3) NOT NULL,
    "available_spots" INTEGER NOT NULL,
    "price_override" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tour_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "num_guests" INTEGER NOT NULL,
    "total_price_sar" DECIMAL(10,2) NOT NULL,
    "booking_status" TEXT NOT NULL DEFAULT 'pending',
    "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
    "booking_reference" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_guests" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "guest_name" TEXT NOT NULL,
    "guest_age" INTEGER,
    "guest_nationality" TEXT,
    "waiver_signed" BOOLEAN NOT NULL DEFAULT false,
    "checked_in" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "payment_gateway" TEXT NOT NULL,
    "amount_sar" DECIMAL(10,2) NOT NULL,
    "transaction_id" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "payment_method" TEXT,
    "payment_date" TIMESTAMP(3),
    "webhook_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_name" TEXT NOT NULL,
    "external_id" TEXT,
    "max_daily_assignments" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_assignments" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ministry_reports" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "report_period" TEXT NOT NULL,
    "report_data" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ministry_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operators_license_number_key" ON "operators"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "operators_email_key" ON "operators"("email");

-- CreateIndex
CREATE UNIQUE INDEX "operator_users_email_key" ON "operator_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_reference_key" ON "bookings"("booking_reference");

-- CreateIndex
CREATE UNIQUE INDEX "payments_booking_id_key" ON "payments"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_assignments_resource_id_schedule_id_key" ON "resource_assignments"("resource_id", "schedule_id");

-- AddForeignKey
ALTER TABLE "operator_users" ADD CONSTRAINT "operator_users_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_schedules" ADD CONSTRAINT "tour_schedules_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "tour_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_guests" ADD CONSTRAINT "booking_guests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "tour_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ministry_reports" ADD CONSTRAINT "ministry_reports_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
