/*
  Warnings:

  - You are about to drop the column `paymentId` on the `Sale` table. All the data in the column will be lost.
  - Added the required column `paymentType` to the `Sale` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CASH', 'CARD_PRESENT', 'PAYPAL');

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "paymentId",
ADD COLUMN     "paymentRef" TEXT,
ADD COLUMN     "paymentType" "PaymentType" NOT NULL;
