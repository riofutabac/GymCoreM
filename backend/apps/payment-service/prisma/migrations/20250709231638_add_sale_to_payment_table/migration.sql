-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "saleId" TEXT,
ALTER COLUMN "membershipId" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;
