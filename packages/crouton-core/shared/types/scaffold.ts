/**
 * Shared scaffold types used by crouton-designer and crouton-atelier.
 */

export interface ScaffoldArtifact {
  filename: string
  category: 'config' | 'app' | 'server' | 'schema' | 'seed'
}

export type ScaffoldStatus = 'idle' | 'creating' | 'done' | 'error' | 'conflict'

export interface ScaffoldStepResult {
  success: boolean
  error?: string
  files?: string[]
  output?: string
  checks?: Array<{ name: string; status: string; message: string }>
}

export interface ScaffoldResult {
  success: boolean
  appDir: string
  steps: Record<string, ScaffoldStepResult>
}
