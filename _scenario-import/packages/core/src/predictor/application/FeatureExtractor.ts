import type { ScriptElement } from "../../script/infrastructure/parser";
import type { ScreenplayFeatures } from "../domain/ScreenplayFeatures";
import type { BoxOfficeData } from "../../market/domain/BoxOfficeData";
import type { CharacterNetwork } from "../../creative/domain/CharacterNetwork";
import type { BeatSheet } from "../../creative/domain/BeatSheet";
import type { EmotionGraph } from "../../creative/domain/EmotionGraph";

export class FeatureExtractor {
  private static readonly VFX_KEYWORDS = [
    "explosion", "explode", "cgi", "flying", "underwater", "spaceship",
    "transform", "morph", "hologram", "laser", "vfx", "sfx",
    "green screen", "wire", "stunt", "fireball", "shockwave",
    "teleport", "invisible", "creature", "dragon", "alien",
    "zero gravity", "weightless", "force field", "portal",
    "disintegrate", "superhero", "superpowers", "magic",
  ];

  public extract(
    scriptId: string,
    elements: ScriptElement[],
    analysis: {
      characterNetwork: CharacterNetwork;
      beatSheet: BeatSheet;
      emotionGraph: EmotionGraph;
    },
    market?: BoxOfficeData
  ): ScreenplayFeatures {
    // ── Existing base counts ───────────────────────────────────────────
    const sceneHeadings = elements.filter(e => e.type === "scene_heading");
    const dialogueLines = elements.filter(e => e.type === "dialogue");
    const actionLines = elements.filter(e => e.type === "action");

    const sceneCount = sceneHeadings.length;
    const dialogueLineCount = dialogueLines.length;
    const actionLineCount = actionLines.length;
    const dialogueToActionRatio =
      actionLineCount > 0 ? dialogueLineCount / actionLineCount : dialogueLineCount;

    const totalDialogueWords = dialogueLines.reduce(
      (acc, curr) => acc + curr.text.split(/\s+/).length, 0
    );
    const averageWordsPerDialogue =
      dialogueLineCount > 0 ? totalDialogueWords / dialogueLineCount : 0;

    // ── INT/EXT and NIGHT/DAY ratios ───────────────────────────────────
    const { intExtRatio, nightDayRatio, uniqueLocationCount } =
      this.computeSceneHeadingMetrics(sceneHeadings);

    // ── Scene-length metrics ───────────────────────────────────────────
    const sceneLengths = this.computeSceneLengths(elements);
    const { avgSceneLength, longestScene, shortestScene, pacingScore } =
      this.computeSceneLengthStats(sceneLengths);

    // ── Character dialogue distribution ────────────────────────────────
    const { protagonistDialoguePct, top3CharDialoguePct, speakingRolesCount } =
      this.computeDialogueDistribution(elements, analysis.characterNetwork);

    // ── Monologue detection ────────────────────────────────────────────
    const monologueCount = this.countMonologues(elements);

    // ── Dialogue punctuation analysis ──────────────────────────────────
    const questionDialoguePct = this.computePunctuationPct(dialogueLines, "?");
    const exclamationPct = this.computePunctuationPct(dialogueLines, "!");

    // ── Element-type counts ────────────────────────────────────────────
    const parentheticalCount = elements.filter(e => e.type === "parenthetical").length;
    const transitionCount = elements.filter(e => e.type === "transition").length;
    const montageCount = this.countKeywordInElements(elements, /\bmontage\b/i);
    const flashbackCount = this.countKeywordInElements(elements, /\bflashback\b/i);

    // ── VFX keyword density ────────────────────────────────────────────
    const vfxKeywordDensity = this.computeVfxKeywordDensity(actionLines);

    // ── Emotion-derived metrics ────────────────────────────────────────
    const scores = analysis.emotionGraph.scenes.map(s => s.score);
    const emotionalVolatility = this.calculateVolatility(scores);
    const emotionalRange = this.computeEmotionalRange(scores);
    const emotionalVariance = this.computeVariance(scores);
    const turningPointCount = this.countTurningPoints(scores, 3);

    return {
      scriptId,
      metrics: {
        // Original 6
        sceneCount,
        characterCount: analysis.characterNetwork.characters.length,
        dialogueLineCount,
        actionLineCount,
        dialogueToActionRatio,
        averageWordsPerDialogue,
        // Extended 21
        intExtRatio,
        nightDayRatio,
        uniqueLocationCount,
        avgSceneLength,
        longestScene,
        shortestScene,
        protagonistDialoguePct,
        top3CharDialoguePct,
        speakingRolesCount,
        monologueCount,
        questionDialoguePct,
        exclamationPct,
        parentheticalCount,
        transitionCount,
        montageCount,
        flashbackCount,
        vfxKeywordDensity,
        emotionalRange,
        emotionalVariance,
        turningPointCount,
        pacingScore,
      },
      market,
      analysis: {
        ...analysis,
        emotionalVolatility,
      },
    };
  }

  // ━━ Scene-Heading Metrics ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Parses scene headings to derive INT/EXT ratio, NIGHT/DAY ratio,
   * and unique location count.
   */
  private computeSceneHeadingMetrics(sceneHeadings: ScriptElement[]): {
    intExtRatio: number;
    nightDayRatio: number;
    uniqueLocationCount: number;
  } {
    let intCount = 0;
    let extCount = 0;
    let nightCount = 0;
    let dayCount = 0;
    const locations = new Set<string>();

    for (const heading of sceneHeadings) {
      const upper = heading.text.toUpperCase();

      // INT/EXT classification
      if (/\bINT\b/.test(upper)) intCount++;
      if (/\bEXT\b/.test(upper)) extCount++;

      // NIGHT/DAY classification
      if (/\bNIGHT\b/.test(upper)) nightCount++;
      if (/\bDAY\b/.test(upper)) dayCount++;

      // Extract location: strip INT/EXT prefix and time-of-day suffix
      const location = this.extractLocation(heading.text);
      if (location) locations.add(location);
    }

    const totalScenes = sceneHeadings.length;
    const intExtRatio = totalScenes > 0 ? intCount / totalScenes : 0;
    const nightDayRatio = totalScenes > 0 ? nightCount / totalScenes : 0;

    return { intExtRatio, nightDayRatio, uniqueLocationCount: locations.size };
  }

  /**
   * Extracts a normalised location string from a scene heading.
   * e.g. "INT. JOHN'S APARTMENT - NIGHT" -> "JOHN'S APARTMENT"
   */
  private extractLocation(headingText: string): string {
    let text = headingText.toUpperCase().trim();
    // Remove INT./EXT./I/E prefix
    text = text.replace(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.?|INT|EXT|EST\.?)\s*/i, "");
    // Remove time-of-day suffix after last dash
    text = text.replace(/\s*-\s*(DAY|NIGHT|DAWN|DUSK|EVENING|MORNING|AFTERNOON|CONTINUOUS|LATER|SAME|SAME TIME).*$/i, "");
    // Remove scene numbers at the start (e.g. "S#1" or "42.")
    text = text.replace(/^(S[#/]?\s*\d+|제\s*\d+\s*경|\d+\.)\s*/i, "");
    return text.trim();
  }

  // ━━ Scene-Length Metrics ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Returns an array of scene lengths (element count between consecutive
   * scene_heading elements).
   */
  private computeSceneLengths(elements: ScriptElement[]): number[] {
    const lengths: number[] = [];
    let currentLength = 0;
    let inScene = false;

    for (const el of elements) {
      if (el.type === "scene_heading") {
        if (inScene) {
          lengths.push(currentLength);
        }
        currentLength = 0;
        inScene = true;
      } else if (inScene) {
        currentLength++;
      }
    }
    // Push the last scene
    if (inScene) {
      lengths.push(currentLength);
    }
    return lengths;
  }

  /**
   * Derives avg/longest/shortest scene length and pacing score from
   * the array of scene lengths.
   */
  private computeSceneLengthStats(sceneLengths: number[]): {
    avgSceneLength: number;
    longestScene: number;
    shortestScene: number;
    pacingScore: number;
  } {
    if (sceneLengths.length === 0) {
      return { avgSceneLength: 0, longestScene: 0, shortestScene: 0, pacingScore: 0 };
    }

    const sum = sceneLengths.reduce((a, b) => a + b, 0);
    const avgSceneLength = sum / sceneLengths.length;
    const longestScene = Math.max(...sceneLengths);
    const shortestScene = Math.min(...sceneLengths);

    // Pacing score: standard deviation of scene lengths
    // Lower value = more consistent pacing
    const pacingScore = this.calculateVolatility(sceneLengths);

    return { avgSceneLength, longestScene, shortestScene, pacingScore };
  }

  // ━━ Character Dialogue Distribution ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Computes protagonist dialogue share, top-3 dialogue share,
   * and total number of speaking roles.
   */
  private computeDialogueDistribution(
    elements: ScriptElement[],
    network: CharacterNetwork
  ): {
    protagonistDialoguePct: number;
    top3CharDialoguePct: number;
    speakingRolesCount: number;
  } {
    // Build a map of character name -> dialogue line count from elements
    const dialogueCounts = new Map<string, number>();
    let currentCharacter = "";
    let totalDialogue = 0;

    for (const el of elements) {
      if (el.type === "character") {
        // Normalise: strip parenthetical extensions like "(V.O.)" or "(CONT'D)"
        currentCharacter = el.text.replace(/\s*\(.*?\)\s*/g, "").trim().toUpperCase();
      } else if (el.type === "dialogue" && currentCharacter) {
        const count = dialogueCounts.get(currentCharacter) || 0;
        dialogueCounts.set(currentCharacter, count + 1);
        totalDialogue++;
      } else if (el.type === "scene_heading") {
        currentCharacter = "";
      }
    }

    if (totalDialogue === 0) {
      return { protagonistDialoguePct: 0, top3CharDialoguePct: 0, speakingRolesCount: 0 };
    }

    // Determine protagonist from CharacterNetwork
    const protagonist = network.characters.find(c => c.role === "Protagonist");
    let protagonistDialoguePct = 0;
    if (protagonist) {
      const protagonistKey = protagonist.name.toUpperCase();
      const protagonistCount = dialogueCounts.get(protagonistKey) || 0;
      protagonistDialoguePct = protagonistCount / totalDialogue;
    }

    // Top 3 characters by dialogue count
    const sortedCounts = Array.from(dialogueCounts.values()).sort((a, b) => b - a);
    const top3Sum = sortedCounts.slice(0, 3).reduce((a, b) => a + b, 0);
    const top3CharDialoguePct = top3Sum / totalDialogue;

    const speakingRolesCount = dialogueCounts.size;

    return { protagonistDialoguePct, top3CharDialoguePct, speakingRolesCount };
  }

  // ━━ Monologue Detection ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Counts monologues: sequences of 10+ consecutive dialogue lines
   * attributed to the same character (parentheticals are allowed
   * in between without breaking the streak).
   */
  private countMonologues(elements: ScriptElement[]): number {
    let monologues = 0;
    let currentCharacter = "";
    let consecutiveDialogue = 0;
    let monologueCounted = false;

    for (const el of elements) {
      if (el.type === "character") {
        // If switching characters, check whether to finalise
        const charName = el.text.replace(/\s*\(.*?\)\s*/g, "").trim().toUpperCase();
        if (charName !== currentCharacter) {
          currentCharacter = charName;
          consecutiveDialogue = 0;
          monologueCounted = false;
        }
      } else if (el.type === "dialogue" && currentCharacter) {
        consecutiveDialogue++;
        if (consecutiveDialogue >= 10 && !monologueCounted) {
          monologues++;
          monologueCounted = true;
        }
      } else if (el.type === "parenthetical") {
        // Parentheticals don't break a monologue streak
      } else {
        // Any other element type resets the streak
        currentCharacter = "";
        consecutiveDialogue = 0;
        monologueCounted = false;
      }
    }

    return monologues;
  }

  // ━━ Punctuation Analysis ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Returns the percentage (0-1) of dialogue lines whose trimmed text
   * ends with the given punctuation character.
   */
  private computePunctuationPct(
    dialogueLines: ScriptElement[],
    punctuation: string
  ): number {
    if (dialogueLines.length === 0) return 0;
    const count = dialogueLines.filter(d => d.text.trimEnd().endsWith(punctuation)).length;
    return count / dialogueLines.length;
  }

  // ━━ Keyword Counting ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Counts the number of elements (scene_heading or action) whose text
   * matches a given keyword pattern.
   */
  private countKeywordInElements(elements: ScriptElement[], pattern: RegExp): number {
    return elements.filter(
      e => (e.type === "scene_heading" || e.type === "action") && pattern.test(e.text)
    ).length;
  }

  // ━━ VFX Keyword Density ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Returns the number of VFX-related keyword matches per 1000 action lines.
   */
  private computeVfxKeywordDensity(actionLines: ScriptElement[]): number {
    if (actionLines.length === 0) return 0;

    let vfxHits = 0;
    for (const line of actionLines) {
      const lower = line.text.toLowerCase();
      for (const kw of FeatureExtractor.VFX_KEYWORDS) {
        if (lower.includes(kw)) {
          vfxHits++;
          break; // count at most one hit per action line
        }
      }
    }

    return (vfxHits / actionLines.length) * 1000;
  }

  // ━━ Emotion-Derived Metrics ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Returns the range (max - min) of emotion scores.
   */
  private computeEmotionalRange(scores: number[]): number {
    if (scores.length === 0) return 0;
    return Math.max(...scores) - Math.min(...scores);
  }

  /**
   * Returns the variance (not std dev) of emotion scores.
   */
  private computeVariance(scores: number[]): number {
    if (scores.length === 0) return 0;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    return scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
  }

  /**
   * Counts the number of turning points: consecutive scene pairs where
   * the absolute score difference exceeds the given threshold.
   */
  private countTurningPoints(scores: number[], threshold: number): number {
    let count = 0;
    for (let i = 1; i < scores.length; i++) {
      const current = scores[i] as number;
      const previous = scores[i - 1] as number;
      if (Math.abs(current - previous) > threshold) {
        count++;
      }
    }
    return count;
  }

  // ━━ Existing Utility ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private calculateVolatility(scores: number[]): number {
    if (scores.length === 0) return 0;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    return Math.sqrt(variance);
  }
}
