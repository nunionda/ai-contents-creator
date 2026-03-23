export interface SceneEmotion {
  sceneNumber: number;
  score: number;         // Valance score ranging from -10 (negative/despair) to +10 (positive/joy)
  dominantEmotion: string; // e.g., "Tension", "Relief", "Fear", "Happiness"
  explanation: string;     // Contextual reasoning for the assigned score
  tension: number;        // 0-10 suspense/conflict intensity
  humor: number;          // 0-10 comedic value
  engagement: 'high' | 'medium' | 'low'; // Predicted audience engagement level
}

export interface EmotionGraph {
  scriptId: string;
  scenes: SceneEmotion[];
}
