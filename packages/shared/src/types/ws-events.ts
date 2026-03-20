export interface PipelineRunSnapshot {
  runId: string
  projectId: string
  projectTitle: string
  status: string
  currentStep: string | null
  progress: number
  steps: string[]
}

export type PipelineWSEvent =
  | { type: "run:snapshot"; runs: PipelineRunSnapshot[] }
  | { type: "run:started"; runId: string; projectId: string; projectTitle: string; steps: string[] }
  | { type: "step:started"; runId: string; step: string; stepIndex: number }
  | { type: "step:completed"; runId: string; step: string; success: boolean; message?: string }
  | { type: "progress"; runId: string; progress: number; currentStep: string }
  | { type: "run:completed"; runId: string; status: "completed" | "failed"; error?: string }
