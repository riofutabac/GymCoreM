-- CreateEnum
CREATE TYPE "MembershipAction" AS ENUM ('CREATED', 'ACTIVATED', 'RENEWED', 'CANCELLED', 'EXPIRED', 'UPDATED');

-- CreateTable
CREATE TABLE "MembershipLog" (
    "id" TEXT NOT NULL,
    "action" "MembershipAction" NOT NULL,
    "details" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "membershipId" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,

    CONSTRAINT "MembershipLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MembershipLog" ADD CONSTRAINT "MembershipLog_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipLog" ADD CONSTRAINT "MembershipLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
