/*
  Warnings:

  - A unique constraint covering the columns `[template]` on the table `BiometricTemplate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "BiometricTemplate_template_key" ON "BiometricTemplate"("template");
