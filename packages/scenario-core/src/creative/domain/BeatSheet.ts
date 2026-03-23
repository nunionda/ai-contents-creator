export interface Beat {
  act: number;          // 1, 2, or 3
  name: string;         // e.g., "Opening Image", "Catalyst", "Midpoint", "All Is Lost"
  sceneStart: number;   // The scene number where this beat begins
  sceneEnd: number;     // The scene number where this beat resolves
  description: string;  // Analytical explanation of the plot point
  pagePercentage: number; // Expected position in screenplay (0-100%)
  pacingNote?: string;    // Warning if beat timing deviates from standard
}

export interface BeatSheet {
  scriptId: string;
  beats: Beat[];
}
