/*
  Warnings:

  - You are about to drop the column `template` on the `BiometricTemplate` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fingerprintId]` on the table `BiometricTemplate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fingerprintId` to the `BiometricTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "BiometricTemplate_template_key";

-- AlterTable
ALTER TABLE "BiometricTemplate" DROP COLUMN "template",
ADD COLUMN     "fingerprintId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BiometricTemplate_fingerprintId_key" ON "BiometricTemplate"("fingerprintId");
