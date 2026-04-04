/**
 * Shared ThinkGraph configuration constants — v2 unified node model.
 * Single source of truth for templates, statuses, and step labels.
 */

// ─── Template Config ───
// Replaces the old NODE_TYPE_CONFIG — templates are sensible defaults, not rigid types

export interface TemplateStyle {
  icon: string
  color: string
  bg: string
}

export const TEMPLATE_CONFIG: Record<string, TemplateStyle> = {
  idea: { icon: 'i-lucide-lightbulb', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  research: { icon: 'i-lucide-search', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  task: { icon: 'i-lucide-hammer', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  feature: { icon: 'i-lucide-rocket', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  meta: { icon: 'i-lucide-brain-circuit', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
}

export const TEMPLATE_BADGE: Record<string, string> = {
  idea: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  research: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  task: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  feature: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  meta: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

/** Default step sequences per template */
export const TEMPLATE_STEPS: Record<string, string[]> = {
  idea: [],
  research: ['analyse'],
  task: ['analyst', 'builder', 'reviewer', 'merger'],
  feature: ['analyst', 'builder', 'launcher', 'reviewer', 'merger'],
  meta: ['analyst', 'builder', 'reviewer', 'merger'],
}

export function getTemplateConfig(template: string): TemplateStyle {
  return TEMPLATE_CONFIG[template] || TEMPLATE_CONFIG.idea
}

export function getTemplateBadge(template: string): string {
  return TEMPLATE_BADGE[template] || TEMPLATE_BADGE.idea
}

// ─── Status Config ───

export const STATUS_CONFIG: Record<string, { class: string; icon: string }> = {
  idle: { class: '', icon: '' },
  draft: { class: 'work-node--draft', icon: 'i-lucide-pencil-line' },
  queued: { class: 'work-node--queued', icon: 'i-lucide-circle-dashed' },
  active: { class: 'work-node--working', icon: 'i-lucide-loader-2' },
  working: { class: 'work-node--working', icon: 'i-lucide-loader-2' },
  thinking: { class: 'work-node--thinking', icon: 'i-lucide-brain' },
  waiting: { class: 'work-node--attention', icon: 'i-lucide-pause-circle' },
  blocked: { class: 'work-node--blocked', icon: 'i-lucide-pause-circle' },
  needs_attention: { class: 'work-node--attention', icon: 'i-lucide-alert-triangle' },
  done: { class: 'work-node--done', icon: 'i-lucide-check-circle-2' },
  rejected: { class: 'work-node--rejected', icon: 'i-lucide-ban' },
  error: { class: 'work-node--error', icon: 'i-lucide-x-circle' },
}

// ─── Pipeline Stages & Labels ───

export const PIPELINE_STAGES = ['analyst', 'builder', 'launcher', 'reviewer', 'merger'] as const

export const STAGE_LABELS: Record<string, string> = {
  analyst: 'A',
  builder: 'B',
  launcher: 'L',
  reviewer: 'R',
  merger: 'M',
  analyse: 'An',
  synthesize: 'S',
  optimizer: 'O',
}

export type PipelineDotState = 'pending' | 'done' | 'working' | 'green' | 'orange' | 'red' | 'current'

export interface PipelineDot {
  stage: string
  label: string
  state: PipelineDotState
}

/**
 * Compute pipeline stage dots for a work item.
 * Shared logic used by both canvas nodes and detail panels.
 */
export function computePipelineStages(
  stage: string | null | undefined,
  status: string | null | undefined,
  signal: string | null | undefined,
  stages: readonly string[] = PIPELINE_STAGES,
): PipelineDot[] {
  if (!stage) {
    return stages.map(s => ({ stage: s, label: STAGE_LABELS[s] || s[0].toUpperCase(), state: 'pending' as const }))
  }

  const currentIdx = stages.indexOf(stage)
  const isWorking = status === 'active' || status === 'working'

  return stages.map((s, idx) => {
    const label = STAGE_LABELS[s] || s[0].toUpperCase()
    if (idx < currentIdx) return { stage: s, label, state: 'done' as const }
    if (idx === currentIdx) {
      if (isWorking) return { stage: s, label, state: 'working' as const }
      if (signal === 'green') return { stage: s, label, state: 'green' as const }
      if (signal === 'orange') return { stage: s, label, state: 'orange' as const }
      if (signal === 'red') return { stage: s, label, state: 'red' as const }
      return { stage: s, label, state: 'current' as const }
    }
    return { stage: s, label, state: 'pending' as const }
  })
}

// ─── Workitem Type Config (for legacy work item nodes) ───

export const WORKITEM_TYPE_CONFIG: Record<string, { icon: string; color: string; badge: string }> = {
  discover: { icon: 'i-lucide-search', color: 'text-violet-500', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  architect: { icon: 'i-lucide-pencil-ruler', color: 'text-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  generate: { icon: 'i-lucide-hammer', color: 'text-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  compose: { icon: 'i-lucide-layout', color: 'text-cyan-500', badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  review: { icon: 'i-lucide-eye', color: 'text-green-500', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  deploy: { icon: 'i-lucide-rocket', color: 'text-rose-500', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
}

export const WORKITEM_STATUS_CONFIG: Record<string, { icon: string; class: string }> = {
  queued: { icon: 'i-lucide-circle-dashed', class: 'work-item--queued' },
  active: { icon: 'i-lucide-loader-2', class: 'work-item--active' },
  waiting: { icon: 'i-lucide-pause-circle', class: 'work-item--waiting' },
  done: { icon: 'i-lucide-check-circle', class: 'work-item--done' },
  blocked: { icon: 'i-lucide-alert-circle', class: 'work-item--blocked' },
}

export const ASSIGNEE_CONFIG: Record<string, { icon: string; label: string }> = {
  pi: { icon: 'i-lucide-bot', label: 'Pi' },
  human: { icon: 'i-lucide-user', label: 'You' },
  client: { icon: 'i-lucide-users', label: 'Client' },
  ci: { icon: 'i-lucide-git-branch', label: 'CI' },
}

// ─── List/Detail View Configs ───

/** Status config for list view items (icon + utility class) */
export const STATUS_DISPLAY: Record<string, { icon: string; class: string }> = {
  queued: { icon: 'i-lucide-circle-dashed', class: 'text-neutral-400' },
  active: { icon: 'i-lucide-loader-2', class: 'text-primary-500' },
  waiting: { icon: 'i-lucide-pause-circle', class: 'text-amber-500' },
  done: { icon: 'i-lucide-check-circle', class: 'text-green-500' },
  blocked: { icon: 'i-lucide-alert-circle', class: 'text-red-500' },
}

/** Template config for detail panel (icon + label + badge class) */
export const DETAIL_TEMPLATE_CONFIG: Record<string, { icon: string; label: string; class: string }> = {
  idea: { icon: 'i-lucide-lightbulb', label: 'Idea', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  research: { icon: 'i-lucide-search', label: 'Research', class: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  task: { icon: 'i-lucide-hammer', label: 'Task', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  feature: { icon: 'i-lucide-rocket', label: 'Feature', class: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  meta: { icon: 'i-lucide-brain-circuit', label: 'Meta', class: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
}

/** Status config for detail panel (icon + label + utility class) */
export const DETAIL_STATUS_CONFIG: Record<string, { icon: string; label: string; class: string }> = {
  queued: { icon: 'i-lucide-circle-dashed', label: 'Queued', class: 'text-neutral-400' },
  active: { icon: 'i-lucide-loader-2', label: 'Active', class: 'text-blue-500' },
  waiting: { icon: 'i-lucide-pause-circle', label: 'Waiting', class: 'text-amber-500' },
  done: { icon: 'i-lucide-check-circle', label: 'Done', class: 'text-green-500' },
  blocked: { icon: 'i-lucide-alert-circle', label: 'Blocked', class: 'text-red-500' },
}

// ─── Connect-to-create node types ───
// Shown in the floating menu when dragging a connection to empty space
export const CONNECT_NODE_TYPES = [
  { id: 'idea', label: 'Idea', icon: 'i-lucide-lightbulb', color: 'text-violet-500' },
  { id: 'research', label: 'Research', icon: 'i-lucide-search', color: 'text-blue-500' },
  { id: 'task', label: 'Task', icon: 'i-lucide-hammer', color: 'text-amber-500' },
  { id: 'feature', label: 'Feature', icon: 'i-lucide-rocket', color: 'text-cyan-500' },
  { id: 'meta', label: 'Meta', icon: 'i-lucide-brain-circuit', color: 'text-rose-500' },
]

// ─── Legacy compatibility ───
// These are kept for components that still reference the old API during migration

/** @deprecated Use getTemplateConfig instead */
export const NODE_TYPE_CONFIG = TEMPLATE_CONFIG
/** @deprecated Use getTemplateBadge instead */
export const NODE_TYPE_BADGE = TEMPLATE_BADGE
/** @deprecated Use getTemplateConfig instead */
export function getNodeTypeConfig(nodeType: string): TemplateStyle {
  return getTemplateConfig(nodeType)
}
/** @deprecated Use getTemplateBadge instead */
export function getNodeTypeBadge(nodeType: string): string {
  return getTemplateBadge(nodeType)
}
