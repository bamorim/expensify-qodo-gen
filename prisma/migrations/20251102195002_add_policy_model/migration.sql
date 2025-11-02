-- CreateEnum
CREATE TYPE "public"."Period" AS ENUM ('PER_EXPENSE');

-- CreateEnum
CREATE TYPE "public"."ReviewMode" AS ENUM ('AUTO_APPROVE', 'MANUAL_REVIEW');

-- CreateTable
CREATE TABLE "public"."Policy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "orgId" TEXT NOT NULL,
    "categoryId" TEXT,
    "userId" TEXT,
    "maxAmount" DECIMAL(10,2) NOT NULL,
    "period" "public"."Period" NOT NULL DEFAULT 'PER_EXPENSE',
    "reviewMode" "public"."ReviewMode" NOT NULL DEFAULT 'MANUAL_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Policy_orgId_idx" ON "public"."Policy"("orgId");

-- CreateIndex
CREATE INDEX "Policy_orgId_categoryId_idx" ON "public"."Policy"("orgId", "categoryId");

-- CreateIndex
CREATE INDEX "Policy_orgId_userId_idx" ON "public"."Policy"("orgId", "userId");

-- CreateIndex
CREATE INDEX "Policy_orgId_categoryId_userId_idx" ON "public"."Policy"("orgId", "categoryId", "userId");

-- AddForeignKey
ALTER TABLE "public"."Policy" ADD CONSTRAINT "Policy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Policy" ADD CONSTRAINT "Policy_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Policy" ADD CONSTRAINT "Policy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
