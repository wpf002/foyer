-- AlterTable
ALTER TABLE "Recommendation" ADD COLUMN "supportingQuestionIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
