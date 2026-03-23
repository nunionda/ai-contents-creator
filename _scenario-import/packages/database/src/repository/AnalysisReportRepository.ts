import { prisma } from "../client";
import type {
  AnalysisResultInput,
  PaginatedResult,
  AnalysisReport,
} from "./types";

export class AnalysisReportRepository {
  async save(input: AnalysisResultInput): Promise<AnalysisResultInput> {
    const report = await prisma.analysisReport.upsert({
      where: { scriptId: input.scriptId },
      create: {
        scriptId: input.scriptId,
        ...(input.market && { market: input.market }),
        totalElements: input.summary.totalElements,
        protagonist: input.summary.protagonist,
        predictedRoi: input.summary.predictedRoi,
        predictedRating: input.summary.predictedRating,
        sceneCount: input.features.sceneCount,
        characterCount: input.features.characterCount,
        dialogueLineCount: input.features.dialogueLineCount,
        actionLineCount: input.features.actionLineCount,
        dialogueToActionRatio: input.features.dialogueToActionRatio,
        averageWordsPerDialogue: input.features.averageWordsPerDialogue,
        characterNetwork: input.characterNetwork as any,
        beatSheet: input.beatSheet as any,
        emotionGraph: input.emotionGraph as any,
        predictions: input.predictions as any,
        ...(input.tropes && { tropes: input.tropes as any }),
        ...(input.coverage && { coverage: input.coverage as any }),
        ...(input.narrativeArc && { narrativeArc: input.narrativeArc as any }),
        ...(input.production && { production: input.production as any }),
      },
      update: {
        ...(input.market && { market: input.market }),
        totalElements: input.summary.totalElements,
        protagonist: input.summary.protagonist,
        predictedRoi: input.summary.predictedRoi,
        predictedRating: input.summary.predictedRating,
        sceneCount: input.features.sceneCount,
        characterCount: input.features.characterCount,
        dialogueLineCount: input.features.dialogueLineCount,
        actionLineCount: input.features.actionLineCount,
        dialogueToActionRatio: input.features.dialogueToActionRatio,
        averageWordsPerDialogue: input.features.averageWordsPerDialogue,
        characterNetwork: input.characterNetwork as any,
        beatSheet: input.beatSheet as any,
        emotionGraph: input.emotionGraph as any,
        predictions: input.predictions as any,
        ...(input.tropes && { tropes: input.tropes as any }),
        ...(input.coverage && { coverage: input.coverage as any }),
        ...(input.narrativeArc && { narrativeArc: input.narrativeArc as any }),
        ...(input.production && { production: input.production as any }),
      },
    });

    return this.toApiResponse(report);
  }

  async findByScriptId(
    scriptId: string
  ): Promise<AnalysisResultInput | null> {
    const report = await prisma.analysisReport.findUnique({
      where: { scriptId },
    });

    if (!report) return null;
    return this.toApiResponse(report);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<AnalysisResultInput>> {
    const skip = (page - 1) * pageSize;

    const [reports, total] = await Promise.all([
      prisma.analysisReport.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.analysisReport.count(),
    ]);

    return {
      data: reports.map((r) => this.toApiResponse(r)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Count reports whose scriptId starts with the given prefix.
   * Used for version auto-increment in naming convention.
   */
  async countByPrefix(prefix: string): Promise<number> {
    return prisma.analysisReport.count({
      where: {
        scriptId: { startsWith: prefix },
      },
    });
  }

  private toApiResponse(report: AnalysisReport): AnalysisResultInput {
    return {
      scriptId: report.scriptId,
      market: report.market,
      summary: {
        totalElements: report.totalElements,
        protagonist: report.protagonist ?? "",
        predictedRoi: report.predictedRoi,
        predictedRating: report.predictedRating,
      },
      characterNetwork: report.characterNetwork as any,
      beatSheet: report.beatSheet as any,
      emotionGraph: report.emotionGraph as any,
      features: {
        sceneCount: report.sceneCount,
        characterCount: report.characterCount,
        dialogueLineCount: report.dialogueLineCount,
        actionLineCount: report.actionLineCount,
        dialogueToActionRatio: report.dialogueToActionRatio,
        averageWordsPerDialogue: report.averageWordsPerDialogue,
      },
      predictions: report.predictions as any,
      ...((report as any).tropes && { tropes: (report as any).tropes as any }),
      ...(report.coverage && { coverage: report.coverage as any }),
      ...(report.narrativeArc && { narrativeArc: report.narrativeArc as any }),
      ...(report.production && { production: report.production as any }),
    };
  }
}
