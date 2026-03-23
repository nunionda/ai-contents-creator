import type { SceneEmotion } from '../domain/EmotionGraph';
import type { NarrativeArc, VonnegutArcType, PacingIssue, TurningPoint } from '../domain/NarrativeArc';
import type { ILLMProvider } from '../infrastructure/llm/ILLMProvider';
import type { MarketLocale } from '../../shared/MarketConfig';
import { getMarketConfig } from '../../shared/MarketConfig';

const ARC_DESCRIPTIONS: Record<VonnegutArcType, string> = {
  'rags-to-riches': 'Steady rise from low to high fortune',
  'riches-to-rags': 'Steady fall from high to low fortune',
  'man-in-a-hole': 'Fall into trouble, then climb back out',
  'icarus': 'Rise to great heights, then fall',
  'cinderella': 'Rise, fall, then ultimate rise',
  'oedipus': 'Fall, rise, then ultimate fall',
};

const GENRE_EXPECTED_ARC: Record<string, VonnegutArcType> = {
  'Action': 'man-in-a-hole',
  'Adventure': 'rags-to-riches',
  'Thriller': 'man-in-a-hole',
  'Drama': 'man-in-a-hole',
  'Tragedy': 'riches-to-rags',
  'Romance': 'cinderella',
  'Comedy': 'rags-to-riches',
  'Horror': 'oedipus',
  'Sci-Fi': 'icarus',
  'Fantasy': 'cinderella',
  'Crime': 'oedipus',
  'Mystery': 'man-in-a-hole',
};

export class NarrativeArcClassifier {
  constructor(private readonly llm: ILLMProvider) {}

  async classify(
    scriptId: string,
    scenes: SceneEmotion[],
    genre?: string,
    market: MarketLocale = 'hollywood',
  ): Promise<NarrativeArc> {
    if (scenes.length < 3) {
      return this.buildDefaultArc(scriptId, scenes, genre);
    }

    // 1. Deterministic arc classification from emotion data
    const arcType = this.classifyArc(scenes);
    const arcConfidence = this.computeConfidence(scenes, arcType);
    const turningPoints = this.detectTurningPoints(scenes);
    const pacingIssues = this.detectPacingIssues(scenes);

    // 2. Genre fit (LLM for genre detection if not provided)
    let detectedGenre = genre;
    if (!detectedGenre) {
      detectedGenre = await this.detectGenre(scenes, market);
    }
    const genreFit = this.computeGenreFit(arcType, detectedGenre);

    return {
      scriptId,
      arcType,
      arcConfidence,
      arcDescription: ARC_DESCRIPTIONS[arcType],
      turningPoints,
      pacingIssues,
      genreFit,
    };
  }

  private classifyArc(scenes: SceneEmotion[]): VonnegutArcType {
    const len = scenes.length;
    const third = Math.ceil(len / 3);
    const act1 = scenes.slice(0, third);
    const act2 = scenes.slice(third, third * 2);
    const act3 = scenes.slice(third * 2);

    const avg = (arr: SceneEmotion[]) =>
      arr.reduce((s, sc) => s + sc.score, 0) / (arr.length || 1);

    const a1 = avg(act1);
    const a2 = avg(act2);
    const a3 = avg(act3);

    // Split act2 into halves for cinderella/oedipus detection
    const mid = Math.ceil(act2.length / 2);
    const a2a = avg(act2.slice(0, mid));
    const a2b = avg(act2.slice(mid));

    // Pattern matching with scores for each arc
    const scores: Record<VonnegutArcType, number> = {
      'rags-to-riches': 0,
      'riches-to-rags': 0,
      'man-in-a-hole': 0,
      'icarus': 0,
      'cinderella': 0,
      'oedipus': 0,
    };

    // rags-to-riches: steady rise
    if (a1 < a2 && a2 < a3) scores['rags-to-riches'] += 3;
    if (a3 > a1) scores['rags-to-riches'] += 1;

    // riches-to-rags: steady fall
    if (a1 > a2 && a2 > a3) scores['riches-to-rags'] += 3;
    if (a3 < a1) scores['riches-to-rags'] += 1;

    // man-in-a-hole: V shape, dip in middle, recovery
    if (a2 < a1 && a2 < a3) scores['man-in-a-hole'] += 3;
    if (a3 >= a1) scores['man-in-a-hole'] += 1;

    // icarus: inverted V, peak in middle
    if (a2 > a1 && a2 > a3) scores['icarus'] += 3;
    if (a3 <= a1) scores['icarus'] += 1;

    // cinderella: down-up-UP pattern
    if (a2a < a1 && a2b > a2a && a3 > a2b) scores['cinderella'] += 3;
    if (a3 > a1 && a2a < a1) scores['cinderella'] += 1;

    // oedipus: up-peak-DOWN pattern
    if (a2a > a1 && a2b > a2a && a3 < a1) scores['oedipus'] += 3;
    if (a3 < a1 && a2 > a1) scores['oedipus'] += 1;

    // Find best match
    let best: VonnegutArcType = 'man-in-a-hole';
    let bestScore = -1;
    for (const [arc, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        best = arc as VonnegutArcType;
      }
    }

    return best;
  }

  private computeConfidence(scenes: SceneEmotion[], arcType: VonnegutArcType): number {
    const len = scenes.length;
    const third = Math.ceil(len / 3);
    const avg = (arr: SceneEmotion[]) =>
      arr.reduce((s, sc) => s + sc.score, 0) / (arr.length || 1);

    const a1 = avg(scenes.slice(0, third));
    const a2 = avg(scenes.slice(third, third * 2));
    const a3 = avg(scenes.slice(third * 2));

    // Measure how strongly the data matches the expected pattern
    const range = Math.max(1, Math.abs(Math.max(a1, a2, a3) - Math.min(a1, a2, a3)));
    const maxRange = 20; // -10 to +10
    const clarity = Math.min(1, range / (maxRange * 0.3));

    return Math.round(clarity * 100) / 100;
  }

  private detectTurningPoints(scenes: SceneEmotion[]): TurningPoint[] {
    const points: TurningPoint[] = [];
    for (let i = 1; i < scenes.length; i++) {
      const diff = scenes[i].score - scenes[i - 1].score;
      const absDiff = Math.abs(diff);
      if (absDiff >= 3) {
        points.push({
          sceneNumber: scenes[i].sceneNumber,
          type: diff > 0 ? 'rise' : 'fall',
          magnitude: Math.round(absDiff * 10) / 10,
        });
      }
    }
    // Also detect plateaus: 3+ scenes with change < 1
    for (let i = 2; i < scenes.length; i++) {
      const d1 = Math.abs(scenes[i].score - scenes[i - 1].score);
      const d2 = Math.abs(scenes[i - 1].score - scenes[i - 2].score);
      if (d1 < 1 && d2 < 1) {
        const exists = points.some(p => p.sceneNumber === scenes[i - 1].sceneNumber && p.type === 'plateau');
        if (!exists) {
          points.push({
            sceneNumber: scenes[i - 1].sceneNumber,
            type: 'plateau',
            magnitude: 0,
          });
        }
      }
    }
    return points.sort((a, b) => a.sceneNumber - b.sceneNumber);
  }

  private detectPacingIssues(scenes: SceneEmotion[]): PacingIssue[] {
    const issues: PacingIssue[] = [];

    // Flat: 3+ consecutive scenes with emotional change < 1.0
    for (let i = 0; i <= scenes.length - 3; i++) {
      let flatCount = 0;
      for (let j = i + 1; j < scenes.length; j++) {
        if (Math.abs(scenes[j].score - scenes[j - 1].score) < 1.0) {
          flatCount++;
        } else break;
      }
      if (flatCount >= 2) {
        const endIdx = i + flatCount + 1;
        const overlap = issues.some(iss => iss.type === 'flat' &&
          iss.startScene <= scenes[endIdx - 1].sceneNumber && iss.endScene >= scenes[i].sceneNumber);
        if (!overlap) {
          issues.push({
            type: 'flat',
            startScene: scenes[i].sceneNumber,
            endScene: scenes[Math.min(endIdx, scenes.length - 1)].sceneNumber,
            description: `Emotional flatline across ${flatCount + 1} scenes`,
            severity: flatCount >= 4 ? 'high' : flatCount >= 3 ? 'medium' : 'low',
          });
        }
      }
    }

    // Sagging: sustained negative slope in act 2
    const third = Math.ceil(scenes.length / 3);
    const act2 = scenes.slice(third, third * 2);
    if (act2.length >= 5) {
      let sagCount = 0;
      for (let i = 1; i < act2.length; i++) {
        const slope = act2[i].score - act2[i - 1].score;
        if (slope < -0.5) sagCount++;
        else sagCount = 0;
        if (sagCount >= 4) {
          issues.push({
            type: 'sagging',
            startScene: act2[i - sagCount].sceneNumber,
            endScene: act2[i].sceneNumber,
            description: 'Sustained emotional decline in Act 2 — audience engagement may drop',
            severity: 'high',
          });
          break;
        }
      }
    }

    // Rushed: 2+ consecutive large jumps (>6 points)
    for (let i = 1; i < scenes.length - 1; i++) {
      const d1 = Math.abs(scenes[i].score - scenes[i - 1].score);
      const d2 = Math.abs(scenes[i + 1].score - scenes[i].score);
      if (d1 > 6 && d2 > 6) {
        issues.push({
          type: 'rushed',
          startScene: scenes[i - 1].sceneNumber,
          endScene: scenes[i + 1].sceneNumber,
          description: 'Rapid emotional swings may feel jarring to the audience',
          severity: 'medium',
        });
      }
    }

    return issues;
  }

  private async detectGenre(scenes: SceneEmotion[], market: MarketLocale = 'hollywood'): Promise<string> {
    const config = getMarketConfig(market);
    const sceneSummary = scenes.map(s => `Scene ${s.sceneNumber}: ${s.dominantEmotion} (${s.score})`).join(', ');

    const systemPrompt = `You are a film genre classifier specializing in ${config.prompts.marketContext}. Based on the emotional arc data, determine the most likely primary genre.
Output ONLY a single word: one of Action, Adventure, Thriller, Drama, Tragedy, Romance, Comedy, Horror, Sci-Fi, Fantasy, Crime, Mystery.`;

    const response = await this.llm.generateText(systemPrompt, sceneSummary);
    const genre = response.content.trim().replace(/[^a-zA-Z-]/g, '');
    return GENRE_EXPECTED_ARC[genre] ? genre : 'Drama';
  }

  private computeGenreFit(arcType: VonnegutArcType, genre: string): NarrativeArc['genreFit'] {
    // Handle composite genres like "Crime, Drama" — try each part
    const genres = genre.split(/[,\/]/).map(g => g.trim()).filter(Boolean);
    let expectedArc: VonnegutArcType = 'man-in-a-hole';
    for (const g of genres) {
      if (GENRE_EXPECTED_ARC[g]) {
        expectedArc = GENRE_EXPECTED_ARC[g];
        break;
      }
    }
    const fitScore = arcType === expectedArc ? 100 : this.arcSimilarity(arcType, expectedArc);

    let deviation = '';
    if (fitScore >= 80) {
      deviation = `Arc aligns well with ${genre} conventions`;
    } else if (fitScore >= 50) {
      deviation = `Arc partially matches ${genre}; expected ${ARC_DESCRIPTIONS[expectedArc]}`;
    } else {
      deviation = `Arc diverges from ${genre} norms (expected ${expectedArc}, got ${arcType})`;
    }

    return { expectedArc, fitScore, deviation };
  }

  private arcSimilarity(a: VonnegutArcType, b: VonnegutArcType): number {
    // Group arcs by shape similarity
    const groups: Record<string, VonnegutArcType[]> = {
      rising: ['rags-to-riches', 'cinderella'],
      falling: ['riches-to-rags', 'oedipus'],
      dip: ['man-in-a-hole'],
      peak: ['icarus'],
    };

    const groupA = Object.entries(groups).find(([, arcs]) => arcs.includes(a))?.[0];
    const groupB = Object.entries(groups).find(([, arcs]) => arcs.includes(b))?.[0];

    if (groupA === groupB) return 70;
    if (
      (groupA === 'rising' && groupB === 'dip') ||
      (groupA === 'dip' && groupB === 'rising') ||
      (groupA === 'falling' && groupB === 'peak') ||
      (groupA === 'peak' && groupB === 'falling')
    ) return 40;
    return 25;
  }

  private buildDefaultArc(scriptId: string, scenes: SceneEmotion[], genre?: string): NarrativeArc {
    return {
      scriptId,
      arcType: 'man-in-a-hole',
      arcConfidence: 0,
      arcDescription: ARC_DESCRIPTIONS['man-in-a-hole'],
      turningPoints: [],
      pacingIssues: [],
      genreFit: {
        expectedArc: GENRE_EXPECTED_ARC[genre || 'Drama'] || 'man-in-a-hole',
        fitScore: 50,
        deviation: 'Insufficient scene data for classification',
      },
    };
  }
}
