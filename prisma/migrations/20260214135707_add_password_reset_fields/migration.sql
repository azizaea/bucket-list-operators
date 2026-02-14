-- AlterTable
ALTER TABLE "operator_users" ADD COLUMN     "reset_code" TEXT,
ADD COLUMN     "reset_code_expiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "reset_code" TEXT,
ADD COLUMN     "reset_code_expiry" TIMESTAMP(3);
