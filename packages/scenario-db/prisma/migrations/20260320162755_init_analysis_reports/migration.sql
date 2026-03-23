-- CreateTable
CREATE TABLE "analysis_reports" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "totalElements" INTEGER NOT NULL,
    "protagonist" TEXT,
    "predictedRoi" TEXT NOT NULL,
    "predictedRating" TEXT NOT NULL,
    "sceneCount" INTEGER NOT NULL,
    "characterCount" INTEGER NOT NULL,
    "dialogueLineCount" INTEGER NOT NULL,
    "actionLineCount" INTEGER NOT NULL,
    "dialogueToActionRatio" DOUBLE PRECISION NOT NULL,
    "averageWordsPerDialogue" DOUBLE PRECISION NOT NULL,
    "characterNetwork" JSONB NOT NULL,
    "beatSheet" JSONB NOT NULL,
    "emotionGraph" JSONB NOT NULL,
    "predictions" JSONB NOT NULL,

    CONSTRAINT "analysis_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analysis_reports_scriptId_key" ON "analysis_reports"("scriptId");

-- CreateIndex
CREATE INDEX "analysis_reports_predictedRoi_idx" ON "analysis_reports"("predictedRoi");

-- CreateIndex
CREATE INDEX "analysis_reports_predictedRating_idx" ON "analysis_reports"("predictedRating");

-- CreateIndex
CREATE INDEX "analysis_reports_createdAt_idx" ON "analysis_reports"("createdAt");
