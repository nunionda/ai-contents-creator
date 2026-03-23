export type VonnegutArcType =
  | 'rags-to-riches'
  | 'riches-to-rags'
  | 'man-in-a-hole'
  | 'icarus'
  | 'cinderella'
  | 'oedipus';

export interface PacingIssue {
  type: 'sagging' | 'rushed' | 'flat';
  startScene: number;
  endScene: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface TurningPoint {
  sceneNumber: number;
  type: 'rise' | 'fall' | 'plateau';
  magnitude: number;
}

export interface NarrativeArc {
  scriptId: string;
  arcType: VonnegutArcType;
  arcConfidence: number;
  arcDescription: string;
  turningPoints: TurningPoint[];
  pacingIssues: PacingIssue[];
  genreFit: {
    expectedArc: VonnegutArcType;
    fitScore: number;
    deviation: string;
  };
}
