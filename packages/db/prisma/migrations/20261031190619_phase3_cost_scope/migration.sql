-- AlterTable
ALTER TABLE "CostEstimate" ADD COLUMN     "basis" TEXT,
ADD COLUMN     "localPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quantity" DOUBLE PRECISION,
ADD COLUMN     "workType" TEXT;
