import { BoxOfficeData } from "../../market/domain/BoxOfficeData";
import { BeatSheet } from "../../creative/domain/BeatSheet";
import { EmotionGraph } from "../../creative/domain/EmotionGraph";
import { CharacterNetwork } from "../../creative/domain/CharacterNetwork";

export interface ScreenplayFeatures {
  scriptId: string;
  
  // Quantitative Metrics (Deterministic)
  metrics: {
    sceneCount: number;
    characterCount: number;
    dialogueLineCount: number;
    actionLineCount: number;
    dialogueToActionRatio: number;
    averageWordsPerDialogue: number;
    // Extended metrics (Phase 2.5)
    intExtRatio: number;            // INT scenes / total scenes
    nightDayRatio: number;          // NIGHT scenes / total scenes
    uniqueLocationCount: number;
    avgSceneLength: number;         // avg lines per scene
    longestScene: number;           // max lines in a single scene
    shortestScene: number;          // min lines in a single scene
    protagonistDialoguePct: number; // protagonist's dialogue share
    top3CharDialoguePct: number;    // top 3 characters' combined dialogue share
    speakingRolesCount: number;     // characters with dialogue
    monologueCount: number;         // 10+ consecutive dialogue lines
    questionDialoguePct: number;    // % of dialogue lines ending with ?
    exclamationPct: number;         // % of dialogue lines ending with !
    parentheticalCount: number;     // parenthetical direction count
    transitionCount: number;        // CUT TO, FADE, etc.
    montageCount: number;           // MONTAGE sequences
    flashbackCount: number;         // FLASHBACK occurrences
    vfxKeywordDensity: number;      // VFX keywords per 1000 action lines
    emotionalRange: number;         // max emotion score - min emotion score
    emotionalVariance: number;      // std dev of emotion scores
    turningPointCount: number;      // emotion shifts > 3 points
    pacingScore: number;            // scene-length variance (lower = more consistent)
  };

  // Market Context (Phase 1)
  market?: BoxOfficeData;

  // Creative/Cognitive Insights (Phase 2)
  analysis: {
    characterNetwork: CharacterNetwork;
    beatSheet: BeatSheet;
    emotionGraph: EmotionGraph;
    emotionalVolatility: number; // Variance in emotional scores
  };
}
