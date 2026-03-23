export interface CharacterNode {
  name: string;
  totalLines: number;     // Number of dialogue lines
  totalWords: number;     // Volume of words spoken
  role: "Protagonist" | "Antagonist" | "Supporting" | "Minor";
  voiceScore?: number;           // 0-100, dialogue style uniqueness
  avgWordsPerLine?: number;
  vocabularyRichness?: number;   // unique words / total words
  sceneAppearances?: number[];   // scene numbers where character appears
}

export interface CharacterEdge {
  source: string;
  target: string;
  weight: number;           // co-appearance scene count
  dialogueExchanges: number;
}

export interface DiversityMetrics {
  speakingRoleDistribution: {
    top1Pct: number;       // protagonist dialogue share %
    top3Pct: number;       // top 3 characters dialogue share %
  };
  centralityGap: number;  // edge count difference between #1 and #2
}

export interface CharacterNetwork {
  scriptId: string;
  characters: CharacterNode[];
  edges?: CharacterEdge[];
  diversityMetrics?: DiversityMetrics;
}
