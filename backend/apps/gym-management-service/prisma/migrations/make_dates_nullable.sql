-- Migration: Make membership dates nullable
-- This allows storing NULL instead of placeholder dates for pending memberships

-- Make startDate and endDate nullable
ALTER TABLE "Membership" ALTER COLUMN "startDate" DROP NOT NULL;
ALTER TABLE "Membership" ALTER COLUMN "endDate" DROP NOT NULL;

-- Optional: Add a computed field to identify placeholder memberships
-- ALTER TABLE "Membership" ADD COLUMN "isPlaceholder" BOOLEAN DEFAULT FALSE;

-- Update existing placeholder records (optional)
-- UPDATE "Membership" 
-- SET "startDate" = NULL, "endDate" = NULL, "isPlaceholder" = TRUE
-- WHERE "startDate" = '2000-01-01T00:00:00.000Z' AND "status" = 'PENDING_PAYMENT';
