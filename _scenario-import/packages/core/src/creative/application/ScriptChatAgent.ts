import type { ILLMProvider } from "../infrastructure/llm/ILLMProvider";

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  scriptId: string;
  message: string;
  history: ChatMessage[];
  reportContext: Record<string, unknown>;
  market?: 'hollywood' | 'korean';
}

export interface ChatResponse {
  reply: string;
  suggestedFollowUps: string[];
  latencyMs: number;
  provider: string;
}

export class ScriptChatAgent {
  constructor(private readonly llm: ILLMProvider) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const { message, history, reportContext, market } = request;
    const isKorean = market === 'korean';

    const contextSummary = this.compressReportContext(reportContext);

    const conversationHistory = history
      .slice(-10)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const systemPrompt = `You are an expert script analyst AI assistant. You have access to the complete analysis report for a screenplay.
Your job is to answer questions about the screenplay based on the analysis data provided below.

${isKorean ? 'IMPORTANT: Respond in Korean (한국어로 답변하세요).' : 'Respond in English.'}

## Analysis Report Context
${contextSummary}

## Instructions
- Answer questions specifically about THIS screenplay based on the analysis data above.
- Be specific — cite scene numbers, character names, scores, and data points from the report.
- If asked for creative suggestions (rewrites, improvements), ground them in the analysis findings.
- Keep answers concise but thorough (2-4 paragraphs for complex questions, 1-2 for simple ones).
- At the end of your response, suggest 3 follow-up questions the user might ask next. Format them as a JSON array on the LAST line of your response, prefixed with "FOLLOW_UPS:" like this:
FOLLOW_UPS:["Question 1?","Question 2?","Question 3?"]`;

    const userPrompt = conversationHistory
      ? `Previous conversation:\n${conversationHistory}\n\nUser: ${message}`
      : `User: ${message}`;

    const response = await this.llm.generateText(systemPrompt, userPrompt);
    if (response.error) {
      throw new Error(`Chat LLM Error: ${response.error}`);
    }

    const { reply, followUps } = this.parseResponse(response.content, isKorean);

    return {
      reply,
      suggestedFollowUps: followUps,
      latencyMs: Date.now() - startTime,
      provider: response.provider,
    };
  }

  private parseResponse(content: string, isKorean: boolean): { reply: string; followUps: string[] } {
    const lines = content.split('\n');
    let followUps: string[] = [];
    let replyLines: string[] = [];

    for (const line of lines) {
      if (line.trim().startsWith('FOLLOW_UPS:')) {
        try {
          const jsonStr = line.trim().replace('FOLLOW_UPS:', '').trim();
          followUps = JSON.parse(jsonStr);
        } catch {
          // ignore parse error
        }
      } else {
        replyLines.push(line);
      }
    }

    // Trim trailing empty lines
    while (replyLines.length > 0 && replyLines[replyLines.length - 1]!.trim() === '') {
      replyLines.pop();
    }

    if (followUps.length === 0) {
      followUps = isKorean
        ? ['이 시나리오의 페이싱 문제점은?', '캐릭터 간 관계를 더 분석해줘', '흥행 예측의 근거는?']
        : ['What are the pacing issues?', 'Analyze the character relationships further', 'What drives the box office prediction?'];
    }

    return { reply: replyLines.join('\n'), followUps: followUps.slice(0, 3) };
  }

  private compressReportContext(report: Record<string, unknown>): string {
    const sections: string[] = [];

    // Coverage
    const coverage = report.coverage as Record<string, unknown> | undefined;
    if (coverage) {
      sections.push(`### Coverage Report
- Title: ${coverage.title || 'Unknown'}
- Genre: ${coverage.genre || 'Unknown'}
- Logline: ${coverage.logline || 'N/A'}
- Synopsis: ${coverage.synopsis || 'N/A'}
- Overall Score: ${coverage.overallScore || 'N/A'}/100
- Verdict: ${coverage.verdict || 'N/A'}
- Strengths: ${(coverage.strengths as string[] || []).join('; ')}
- Weaknesses: ${(coverage.weaknesses as string[] || []).join('; ')}
- Market Potential: ${coverage.marketPotential || 'N/A'}
- Comparable Titles: ${(coverage.comparableTitles as string[] || []).join(', ')}
- Categories: ${((coverage.categories as any[]) || []).map((c: any) => `${c.name}: ${c.score}/${c.maxScore}`).join(', ')}`);
    }

    // Beat Sheet
    const beatSheet = report.beatSheet as any[] | undefined;
    if (beatSheet && beatSheet.length > 0) {
      sections.push(`### Beat Sheet (${beatSheet.length} beats)
${beatSheet.map((b: any) => `- ${b.name} (${b.pagePercentage || 0}%): ${b.description}`).join('\n')}`);
    }

    // Emotion Graph (summarized)
    const emotions = report.emotionGraph as any[] | undefined;
    if (emotions && emotions.length > 0) {
      const scores = emotions.map((e: any) => e.score);
      const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      const minScene = emotions.reduce((min: any, e: any) => e.score < min.score ? e : min, emotions[0]);
      const maxScene = emotions.reduce((max: any, e: any) => e.score > max.score ? e : max, emotions[0]);
      sections.push(`### Emotion Arc (${emotions.length} scenes)
- Average emotional valence: ${avgScore.toFixed(1)}
- Lowest point: Scene ${minScene.sceneNumber} (${minScene.score}, ${minScene.dominantEmotion}) — ${minScene.explanation}
- Highest point: Scene ${maxScene.sceneNumber} (${maxScene.score}, ${maxScene.dominantEmotion}) — ${maxScene.explanation}
- Scene details: ${emotions.map((e: any) => `S${e.sceneNumber}:${e.score}(${e.dominantEmotion},T${e.tension || 0},H${e.humor || 0},${e.engagement || 'medium'})`).join(' | ')}`);
    }

    // Characters
    const charNet = report.characterNetwork as Record<string, unknown> | undefined;
    if (charNet) {
      const characters = (charNet.characters as any[]) || [];
      sections.push(`### Characters (${characters.length} total)
${characters.slice(0, 10).map((c: any, i: number) =>
  `${i + 1}. ${c.name} — ${c.dialogueCount || 0} lines, ${c.role || 'unknown'} role${c.archetype ? `, archetype: ${c.archetype}` : ''}`
).join('\n')}`);

      const edges = (charNet.edges as any[]) || [];
      if (edges.length > 0) {
        sections.push(`Key Relationships: ${edges.slice(0, 8).map((e: any) =>
          `${e.source}↔${e.target} (${e.weight || 0} interactions${e.sentiment ? `, ${e.sentiment}` : ''})`
        ).join(', ')}`);
      }
    }

    // Predictions
    const predictions = report.predictions as Record<string, unknown> | undefined;
    if (predictions) {
      const roi = predictions.roi as Record<string, unknown> | undefined;
      if (roi) {
        sections.push(`### ROI Prediction
- Tier: ${roi.tier}
- Multiplier: ${roi.predictedMultiplier}x
- Confidence: ${roi.confidence}%
- Reasoning: ${roi.reasoning}`);

        const range = roi.revenueRange as Record<string, unknown> | undefined;
        if (range) {
          sections.push(`- Revenue Range: Low ${range.low}, Likely ${range.likely}, High ${range.high}`);
        }
      }

      const rating = predictions.rating as Record<string, unknown> | undefined;
      if (rating) {
        sections.push(`### Content Rating
- Rating: ${rating.rating}
- Reasons: ${((rating.reasons as string[]) || []).join('; ')}`);
      }

      const comps = predictions.comps as any[] | undefined;
      if (comps && comps.length > 0) {
        sections.push(`### Comparable Films
${comps.map((c: any) => `- ${c.title} (similarity: ${c.similarityScore}, ROI: ${c.marketPerformance?.roi}x) — ${(c.sharedTraits || []).join(', ')}`).join('\n')}`);
      }
    }

    // Tropes
    const tropes = report.tropes as string[] | undefined;
    if (tropes && tropes.length > 0) {
      sections.push(`### Tropes: ${tropes.join(', ')}`);
    }

    // Narrative Arc
    const arc = report.narrativeArc as Record<string, unknown> | undefined;
    if (arc) {
      sections.push(`### Narrative Arc
- Type: ${arc.arcType || 'Unknown'}
- Description: ${arc.arcDescription || 'N/A'}
- Genre Fit: ${(arc.genreFit as any)?.score || 'N/A'}/10`);
    }

    // Production
    const prod = report.production as Record<string, unknown> | undefined;
    if (prod) {
      const budget = prod.budgetEstimate as Record<string, unknown> | undefined;
      sections.push(`### Production
- Locations: ${prod.uniqueLocationCount || 0}
- INT/EXT Ratio: ${prod.intExtRatio || 'N/A'}
- Speaking Roles: ${prod.totalSpeakingRoles || 0}
- Shooting Days: ${prod.estimatedShootingDays || 0}
- VFX Complexity: ${prod.vfxComplexityScore || 0}/10
${budget ? `- Budget Estimate: Low $${budget.low}, Likely $${budget.likely}, High $${budget.high}` : ''}`);
    }

    // Features (metrics)
    const features = report.features as Record<string, unknown> | undefined;
    if (features) {
      sections.push(`### Script Metrics
- Scene Count: ${features.sceneCount}
- Character Count: ${features.characterCount}
- Dialogue/Action Ratio: ${features.dialogueToActionRatio}
- Avg Words/Dialogue: ${features.averageWordsPerDialogue}
- Monologue Count: ${features.monologueCount || 0}
- Question Dialogue %: ${features.questionDialoguePct || 0}%`);
    }

    return sections.join('\n\n');
  }
}
