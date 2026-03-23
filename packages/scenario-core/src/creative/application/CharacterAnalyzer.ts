import type { ScriptElement } from "../../script/infrastructure/parser";
import type {
  CharacterNetwork,
  CharacterNode,
  CharacterEdge,
  DiversityMetrics,
} from "../domain/CharacterNetwork";

export class CharacterAnalyzer {
  /**
   * Deterministically analyzes the structural presence of characters throughout the screenplay.
   * Includes SNA edges, voice scoring, and diversity metrics.
   */
  /**
   * Extract character names embedded inline in action text.
   * Handles cinematographic format: "MS — 강설희(32)가 앉아 있다."
   * Pattern: Korean/CJK name followed by (age) in action lines.
   */
  private extractInlineCharacters(elements: ScriptElement[]): Map<string, Set<number>> {
    const inlineChars = new Map<string, Set<number>>();
    let currentScene = 0;

    // Pattern: Korean name (2-4 chars) followed by parenthetical containing age info
    // Matches: 강설희(32), 오유진(17/여), 아키(50대/남), 마유(30대)
    const inlineNameRe = /([가-힣]{2,4})\([^)]*\d[^)]*\)/g;

    for (const el of elements) {
      if (el.type === "scene_heading") {
        currentScene++;
      } else if (el.type === "action") {
        let match;
        inlineNameRe.lastIndex = 0;
        while ((match = inlineNameRe.exec(el.text)) !== null) {
          const name = match[1];
          if (!inlineChars.has(name)) {
            inlineChars.set(name, new Set());
          }
          if (currentScene > 0) inlineChars.get(name)!.add(currentScene);
        }
      }
    }

    return inlineChars;
  }

  public analyze(scriptId: string, elements: ScriptElement[]): CharacterNetwork {
    // ---------- Pass 0: extract inline characters from action text (cinematographic format) ----------
    const inlineCharacters = this.extractInlineCharacters(elements);

    // ---------- Pass 1: collect per-character stats + scene tracking ----------
    const characterStats = new Map<
      string,
      { lines: number; words: number; wordSet: Set<string>; scenes: Set<number>; dialogues: string[] }
    >();
    let currentCharacter = "";
    let currentScene = 0;

    // Track which characters appear in each scene (for edge computation)
    const sceneCharacters = new Map<number, Set<string>>();
    // Track sequential dialogue pairs per scene (for exchange counting)
    const dialoguePairs: { scene: number; from: string; to: string }[] = [];
    let previousSpeaker = "";

    for (const el of elements) {
      if (el.type === "scene_heading") {
        currentScene++;
        currentCharacter = "";
        previousSpeaker = "";
      } else if (el.type === "character") {
        currentCharacter = el.text.replace(/\s*\(.*?\)\s*/g, "").trim();
        // Register character in scene
        if (currentScene > 0) {
          if (!sceneCharacters.has(currentScene)) {
            sceneCharacters.set(currentScene, new Set());
          }
          sceneCharacters.get(currentScene)!.add(currentCharacter);
        }
      } else if (el.type === "dialogue" && currentCharacter) {
        const stats = characterStats.get(currentCharacter) || {
          lines: 0,
          words: 0,
          wordSet: new Set<string>(),
          scenes: new Set<number>(),
          dialogues: [],
        };
        stats.lines += 1;
        const words = el.text.split(/\s+/).filter((w) => w.length > 0);
        stats.words += words.length;
        for (const w of words) stats.wordSet.add(w.toLowerCase());
        if (currentScene > 0) stats.scenes.add(currentScene);
        stats.dialogues.push(el.text);
        characterStats.set(currentCharacter, stats);

        // Dialogue exchange: A speaks then B speaks = 1 exchange
        if (previousSpeaker && previousSpeaker !== currentCharacter && currentScene > 0) {
          dialoguePairs.push({ scene: currentScene, from: previousSpeaker, to: currentCharacter });
        }
        previousSpeaker = currentCharacter;
      } else if (el.type === "action") {
        currentCharacter = "";
      }
    }

    // ---------- Pass 1.5: merge inline characters (cinematographic format) ----------
    // Only add inline characters that weren't already found via standard character cues
    for (const [name, scenes] of inlineCharacters) {
      if (!characterStats.has(name) && scenes.size >= 1) {
        // Character appears inline with age annotation — likely a real character
        characterStats.set(name, {
          lines: 0,
          words: 0,
          wordSet: new Set(),
          scenes,
          dialogues: [],
        });
        // Register in sceneCharacters for edge computation
        for (const scene of scenes) {
          if (!sceneCharacters.has(scene)) {
            sceneCharacters.set(scene, new Set());
          }
          sceneCharacters.get(scene)!.add(name);
        }
      } else if (characterStats.has(name)) {
        // Merge scene appearances from inline detection
        const stats = characterStats.get(name)!;
        for (const scene of scenes) stats.scenes.add(scene);
      }
    }

    // ---------- Pass 1.6: merge full names into short names ----------
    // Korean scripts use full names in action (강설희(32)) but short names in dialogue (설희).
    // Also handles surname+name (한진우) vs given name only (진우).
    // Merge the longer form into the shorter form (which has dialogue stats).
    const allNames = Array.from(characterStats.keys());
    const mergeMap = new Map<string, string>(); // longName → shortName

    for (const longName of allNames) {
      if (longName.length < 2) continue;
      for (const shortName of allNames) {
        if (longName === shortName) continue;
        if (shortName.length < 2 || shortName.length >= longName.length) continue;
        // Short name is a suffix of long name (강설희 → 설희, 한진우 → 진우)
        // Also handles particle-prefixed names (이리철 → 리철, where 이 is a particle)
        if (longName.endsWith(shortName) ||
            (longName.length === shortName.length + 1 && /^[이가은는]/.test(longName) && longName.slice(1) === shortName)) {
          const longStats = characterStats.get(longName)!;
          const shortStats = characterStats.get(shortName)!;
          // Merge into the version with more dialogue (usually the short name)
          if (shortStats.lines >= longStats.lines) {
            mergeMap.set(longName, shortName);
          } else {
            mergeMap.set(shortName, longName);
          }
        }
      }
    }

    // Apply merges
    for (const [fromName, toName] of mergeMap) {
      const fromStats = characterStats.get(fromName);
      const toStats = characterStats.get(toName);
      if (!fromStats || !toStats) continue;

      // Merge stats into target
      toStats.lines += fromStats.lines;
      toStats.words += fromStats.words;
      for (const w of fromStats.wordSet) toStats.wordSet.add(w);
      for (const s of fromStats.scenes) toStats.scenes.add(s);
      toStats.dialogues.push(...fromStats.dialogues);

      // Remove source
      characterStats.delete(fromName);

      // Update sceneCharacters references
      for (const [, chars] of sceneCharacters) {
        if (chars.has(fromName)) {
          chars.delete(fromName);
          chars.add(toName);
        }
      }

      // Update dialoguePairs references
      for (const pair of dialoguePairs) {
        if (pair.from === fromName) pair.from = toName;
        if (pair.to === fromName) pair.to = toName;
      }
    }

    // ---------- Pass 1.6b: strip particle prefixes when short form doesn't exist ----------
    // e.g., 이리철 → 리철 (이 is a common surname/particle prefix)
    // Only applies when the stripped name doesn't already exist
    const PARTICLE_PREFIXES = /^[이가은는]/;
    const renameMap = new Map<string, string>();
    for (const [name] of characterStats) {
      if (name.length >= 3 && PARTICLE_PREFIXES.test(name)) {
        const stripped = name.slice(1);
        if (!characterStats.has(stripped) && !renameMap.has(name)) {
          // Check if stripped name is a valid Korean name (2+ chars, all Korean)
          if (/^[가-힣]{2,}$/.test(stripped)) {
            renameMap.set(name, stripped);
          }
        }
      }
    }
    for (const [oldName, newName] of renameMap) {
      const stats = characterStats.get(oldName);
      if (!stats) continue;
      // Only rename if this is an inline-only character (0 dialogue lines)
      // Characters with dialogue lines have their name set by the script's character cues
      if (stats.lines > 0) continue;
      characterStats.set(newName, stats);
      characterStats.delete(oldName);
      for (const [, chars] of sceneCharacters) {
        if (chars.has(oldName)) {
          chars.delete(oldName);
          chars.add(newName);
        }
      }
    }

    // ---------- Pass 1.7: filter non-character entries ----------
    // Remove entries with 0 dialogue lines AND 0 scene appearances (formatting noise)
    // Also remove entries that are likely organization names or titles
    const ORG_SUFFIXES_RE = /(?:총국|정찰국|본부|위원회|사무실|경찰서|사령부|연구소|검찰청|특공대|수사대|카르텔)$/;
    const NOISE_WORDS = new Set([
      '크기', '간격', '속도', '높이', '너비', '위치', '방향', '비율', '굵기',
      '그냥', '그래', '아마', '내가', '우리', '뉴스', '헤이', '제단', '수술실', '현장',
      '씨발', '으악', '부웅', '하더니', '그러자',
    ]);

    for (const [name, stats] of characterStats) {
      // Remove formatting noise words
      if (NOISE_WORDS.has(name)) {
        characterStats.delete(name);
        continue;
      }
      // Remove organization names
      if (ORG_SUFFIXES_RE.test(name)) {
        characterStats.delete(name);
        continue;
      }
      // Remove multi-word entries that are action text fragments (verb endings in any word)
      if (name.includes(' ')) {
        const words = name.split(/\s+/);
        const hasVerbWord = words.some(w => /[다고며면서지요네까죠게할된건걸인]$/.test(w));
        if (hasVerbWord || stats.lines <= 2) {
          characterStats.delete(name);
          continue;
        }
      }
    }

    // ---------- Pass 1.8: clean up sceneCharacters and dialoguePairs to match filtered characterStats ----------
    const validCharacters = new Set(characterStats.keys());
    for (const [, chars] of sceneCharacters) {
      for (const name of chars) {
        if (!validCharacters.has(name)) {
          chars.delete(name);
        }
      }
    }
    // Remove dialogue pairs referencing filtered-out characters
    for (let i = dialoguePairs.length - 1; i >= 0; i--) {
      const pair = dialoguePairs[i]!;
      if (!validCharacters.has(pair.from) || !validCharacters.has(pair.to)) {
        dialoguePairs.splice(i, 1);
      }
    }

    // ---------- Pass 2: build CharacterNode[] ----------
    const sortedEntries = Array.from(characterStats.entries()).sort(
      (a, b) => b[1].lines - a[1].lines,
    );

    const totalDialogueWords = sortedEntries.reduce((s, [, v]) => s + v.words, 0);

    const characters: CharacterNode[] = sortedEntries.map(([name, stats], index) => {
      let role: CharacterNode["role"] = "Minor";
      if (index === 0) role = "Protagonist";
      else if (index === 1) role = "Antagonist";
      else if (index <= 5) role = "Supporting";

      const avgWordsPerLine = stats.lines > 0 ? +(stats.words / stats.lines).toFixed(1) : 0;
      const vocabularyRichness = stats.words > 0 ? +(stats.wordSet.size / stats.words).toFixed(3) : 0;

      return {
        name,
        totalLines: stats.lines,
        totalWords: stats.words,
        role,
        avgWordsPerLine,
        vocabularyRichness,
        sceneAppearances: Array.from(stats.scenes).sort((a, b) => a - b),
      };
    });

    // ---------- Pass 3: voice score ----------
    // voiceScore = how different this character's dialogue style is from the cast average
    if (characters.length > 1) {
      const avgWPL =
        characters.reduce((s, c) => s + (c.avgWordsPerLine ?? 0), 0) / characters.length;
      const avgVR =
        characters.reduce((s, c) => s + (c.vocabularyRichness ?? 0), 0) / characters.length;

      for (const c of characters) {
        const wplDeviation = Math.abs((c.avgWordsPerLine ?? 0) - avgWPL);
        const vrDeviation = Math.abs((c.vocabularyRichness ?? 0) - avgVR);
        // Normalize: higher deviation = more unique voice
        const rawScore = wplDeviation * 3 + vrDeviation * 100;
        c.voiceScore = Math.min(100, Math.round(rawScore));
      }
    } else {
      for (const c of characters) c.voiceScore = 50;
    }

    // ---------- Pass 4: edges (co-appearance + dialogue exchanges) ----------
    const edgeMap = new Map<string, { weight: number; exchanges: number }>();

    const edgeKey = (a: string, b: string) => (a < b ? `${a}||${b}` : `${b}||${a}`);

    // Co-appearance edges
    for (const [, chars] of sceneCharacters) {
      const arr = Array.from(chars);
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const key = edgeKey(arr[i], arr[j]);
          const edge = edgeMap.get(key) || { weight: 0, exchanges: 0 };
          edge.weight++;
          edgeMap.set(key, edge);
        }
      }
    }

    // Dialogue exchanges
    for (const pair of dialoguePairs) {
      const key = edgeKey(pair.from, pair.to);
      const edge = edgeMap.get(key) || { weight: 0, exchanges: 0 };
      edge.exchanges++;
      edgeMap.set(key, edge);
    }

    const edges: CharacterEdge[] = Array.from(edgeMap.entries())
      .map(([key, val]) => {
        const parts = key.split("||");
        return {
          source: parts[0]!,
          target: parts[1]!,
          weight: val.weight,
          dialogueExchanges: val.exchanges,
        };
      })
      .sort((a, b) => b.weight - a.weight);

    // ---------- Pass 5: diversity metrics ----------
    const diversityMetrics: DiversityMetrics | undefined =
      characters.length >= 3
        ? (() => {
            const top1Pct =
              totalDialogueWords > 0
                ? +((characters[0]!.totalWords / totalDialogueWords) * 100).toFixed(1)
                : 0;
            const top3Words = characters.slice(0, 3).reduce((s, c) => s + c.totalWords, 0);
            const top3Pct =
              totalDialogueWords > 0
                ? +((top3Words / totalDialogueWords) * 100).toFixed(1)
                : 0;

            // Centrality = edge count per character
            const edgeCounts = new Map<string, number>();
            for (const e of edges) {
              edgeCounts.set(e.source, (edgeCounts.get(e.source) || 0) + e.weight);
              edgeCounts.set(e.target, (edgeCounts.get(e.target) || 0) + e.weight);
            }
            const sorted = Array.from(edgeCounts.values()).sort((a, b) => b - a);
            const centralityGap = sorted.length >= 2 ? sorted[0]! - sorted[1]! : 0;

            return { speakingRoleDistribution: { top1Pct, top3Pct }, centralityGap };
          })()
        : undefined;

    return { scriptId, characters, edges, diversityMetrics };
  }
}
