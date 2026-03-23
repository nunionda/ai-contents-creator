// ── E2E Simulation Test Types ──

export interface ScenarioConfig {
  fileName: string;
  filePath: string;
  label: string;
  genre: string;
  isBaseline: boolean;
  expectedPageCount: number;
}

export type EngineVerdict = 'PASS' | 'FAIL' | 'WARN';

export interface EngineResult {
  engine: string;
  verdict: EngineVerdict;
  provider: string;
  isMock: boolean;
  durationMs: number;
  summary: string;      // e.g., "15 beats", "12 chars"
  details: string;       // human-readable explanation on failure
  metrics: Record<string, number | string | boolean>;
}

export interface ScenarioReport {
  scenario: ScenarioConfig;
  scriptId: string;
  totalDurationMs: number;
  engines: EngineResult[];
  overallVerdict: EngineVerdict;
  rawResponse: any;
}

export interface CrossComparison {
  metric: string;
  values: Record<string, string | number>;
}

export interface E2EReport {
  timestamp: string;
  strategy: string;
  market: string;
  scenarios: ScenarioReport[];
  comparison: CrossComparison[];
  summary: {
    totalPass: number;
    totalFail: number;
    totalWarn: number;
    totalEngines: number;
  };
}
