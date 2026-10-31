-- CreateEnum
CREATE TYPE "UserKind" AS ENUM ('HOMEOWNER', 'AGENT', 'STAGER', 'CONTRACTOR', 'DESIGNER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('INTAKE', 'ANALYZING', 'BRIEF_READY', 'IN_PROGRESS', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BriefSection" AS ENUM ('SPACE', 'LIFE', 'AESTHETIC', 'CONSTRAINTS');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('KITCHEN', 'BATHROOM', 'LIVING', 'DINING', 'BEDROOM', 'ENTRY', 'OFFICE', 'BASEMENT', 'OUTDOOR', 'OTHER');

-- CreateEnum
CREATE TYPE "PhotoAngle" AS ENUM ('WIDE', 'CORNER', 'DETAIL', 'CEILING', 'FLOOR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RecommendationCategory" AS ENUM ('STRUCTURAL', 'COSMETIC', 'FUNCTIONAL', 'ATMOSPHERIC');

-- CreateEnum
CREATE TYPE "EffortLevel" AS ENUM ('WEEKEND', 'WEEK', 'MULTI_WEEK');

-- CreateEnum
CREATE TYPE "CostSource" AS ENUM ('BASELINE_HOMEWYSE', 'BASELINE_RSMEANS', 'BASELINE_STATIC', 'FOYER_FLYWHEEL', 'USER_QUOTE');

-- CreateEnum
CREATE TYPE "RoadmapPhase" AS ENUM ('QUICK_WINS', 'MID_RANGE', 'MAJOR');

-- CreateEnum
CREATE TYPE "PermitLikelihood" AS ENUM ('NONE', 'LIKELY', 'REQUIRED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ExecutionPath" AS ENUM ('DIY', 'HANDYMAN', 'LICENSED_CONTRACTOR');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('CONTRACTOR_BRIEF', 'DESIGNER_BRIEF', 'SHOPPING_LIST', 'PERMIT_CHECKLIST', 'CONTRACTOR_QUESTIONS');

-- CreateEnum
CREATE TYPE "RenderKind" AS ENUM ('CONCEPT', 'MATERIAL_BOARD', 'MOOD_BOARD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "kind" "UserKind" NOT NULL DEFAULT 'HOMEOWNER',
    "zip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'INTAKE',
    "budgetLowCents" INTEGER,
    "budgetHighCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brief" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefAnswer" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "section" "BriefSection" NOT NULL,
    "prompt" TEXT NOT NULL,
    "raw" TEXT NOT NULL,
    "parsed" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BriefAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RoomType" NOT NULL,
    "widthIn" INTEGER,
    "lengthIn" INTEGER,
    "ceilingIn" INTEGER,
    "dimsFromScan" BOOLEAN NOT NULL DEFAULT false,
    "fixedElements" JSONB,
    "movableElements" JSONB,
    "description" TEXT,
    "critique" JSONB,
    "critiqueModel" TEXT,
    "critiquedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT,
    "mime" TEXT,
    "angle" "PhotoAngle" NOT NULL DEFAULT 'UNKNOWN',
    "analysis" JSONB,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roomId" TEXT,
    "briefAnswerId" TEXT NOT NULL,
    "category" "RecommendationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "preserve" TEXT,
    "effort" "EffortLevel" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "needsProReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostEstimate" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "lowCents" INTEGER NOT NULL,
    "midCents" INTEGER NOT NULL,
    "highCents" INTEGER NOT NULL,
    "zip" TEXT NOT NULL,
    "source" "CostSource" NOT NULL,
    "regionFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "actualCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostDataPoint" (
    "id" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "workType" TEXT NOT NULL,
    "quotedCents" INTEGER,
    "actualCents" INTEGER,
    "baselineCents" INTEGER NOT NULL,
    "source" "CostSource" NOT NULL,
    "unit" TEXT,
    "quantity" DOUBLE PRECISION,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostDataPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "recommendationId" TEXT,
    "phase" "RoadmapPhase" NOT NULL,
    "order" INTEGER NOT NULL,
    "scope" TEXT NOT NULL,
    "why" TEXT NOT NULL,
    "path" "ExecutionPath" NOT NULL,
    "permit" "PermitLikelihood" NOT NULL DEFAULT 'UNKNOWN',
    "effort" "EffortLevel" NOT NULL,
    "lowCents" INTEGER,
    "highCents" INTEGER,
    "riskNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapDependency" (
    "id" TEXT NOT NULL,
    "dependentId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "RoadmapDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Render" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "kind" "RenderKind" NOT NULL DEFAULT 'CONCEPT',
    "url" TEXT NOT NULL,
    "provenance" JSONB,
    "isDirectional" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Render_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvalRun" (
    "id" TEXT NOT NULL,
    "rubricHash" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "judgeModel" TEXT NOT NULL,
    "meanScore" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvalRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvalScore" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,

    CONSTRAINT "EvalScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_userId_updatedAt_idx" ON "Project"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Project_zip_idx" ON "Project"("zip");

-- CreateIndex
CREATE UNIQUE INDEX "Brief_projectId_key" ON "Brief"("projectId");

-- CreateIndex
CREATE INDEX "BriefAnswer_briefId_section_idx" ON "BriefAnswer"("briefId", "section");

-- CreateIndex
CREATE UNIQUE INDEX "BriefAnswer_briefId_questionId_key" ON "BriefAnswer"("briefId", "questionId");

-- CreateIndex
CREATE INDEX "Room_projectId_idx" ON "Room"("projectId");

-- CreateIndex
CREATE INDEX "Photo_roomId_idx" ON "Photo"("roomId");

-- CreateIndex
CREATE INDEX "Recommendation_projectId_priority_idx" ON "Recommendation"("projectId", "priority");

-- CreateIndex
CREATE INDEX "Recommendation_briefAnswerId_idx" ON "Recommendation"("briefAnswerId");

-- CreateIndex
CREATE UNIQUE INDEX "CostEstimate_recommendationId_key" ON "CostEstimate"("recommendationId");

-- CreateIndex
CREATE INDEX "CostEstimate_zip_source_idx" ON "CostEstimate"("zip", "source");

-- CreateIndex
CREATE INDEX "CostDataPoint_zip_workType_observedAt_idx" ON "CostDataPoint"("zip", "workType", "observedAt");

-- CreateIndex
CREATE INDEX "CostDataPoint_workType_idx" ON "CostDataPoint"("workType");

-- CreateIndex
CREATE INDEX "RoadmapItem_projectId_idx" ON "RoadmapItem"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapItem_projectId_phase_order_key" ON "RoadmapItem"("projectId", "phase", "order");

-- CreateIndex
CREATE INDEX "RoadmapDependency_prerequisiteId_idx" ON "RoadmapDependency"("prerequisiteId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapDependency_dependentId_prerequisiteId_key" ON "RoadmapDependency"("dependentId", "prerequisiteId");

-- CreateIndex
CREATE INDEX "Artifact_projectId_idx" ON "Artifact"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Artifact_projectId_type_version_key" ON "Artifact"("projectId", "type", "version");

-- CreateIndex
CREATE INDEX "Render_recommendationId_idx" ON "Render"("recommendationId");

-- CreateIndex
CREATE INDEX "EvalRun_createdAt_idx" ON "EvalRun"("createdAt");

-- CreateIndex
CREATE INDEX "EvalScore_runId_caseId_idx" ON "EvalScore"("runId", "caseId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefAnswer" ADD CONSTRAINT "BriefAnswer_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_briefAnswerId_fkey" FOREIGN KEY ("briefAnswerId") REFERENCES "BriefAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostEstimate" ADD CONSTRAINT "CostEstimate_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapItem" ADD CONSTRAINT "RoadmapItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapItem" ADD CONSTRAINT "RoadmapItem_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapDependency" ADD CONSTRAINT "RoadmapDependency_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "RoadmapItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapDependency" ADD CONSTRAINT "RoadmapDependency_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "RoadmapItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Render" ADD CONSTRAINT "Render_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvalScore" ADD CONSTRAINT "EvalScore_runId_fkey" FOREIGN KEY ("runId") REFERENCES "EvalRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
