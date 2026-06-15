/**
 * Shared ThinkGraph configuration constants — v2 unified node model.
 * Single source of truth for templates, statuses, and step labels.
 */

// ─── Template Config (unified type system) ───

export interface TemplateStyle {
  icon: string
  color: string
  bg: string
}

export const TEMPLATE_CONFIG: Record<string, TemplateStyle> = {
  idea: { icon: 'i-lucide-lightbulb', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  discover: { icon: 'i-lucide-search', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  architect: { icon: 'i-lucide-drafting-compass', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  generate: { icon: 'i-lucide-wand-sparkles', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  compose: { icon: 'i-lucide-hammer', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  review: { icon: 'i-lucide-eye', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  deploy: { icon: 'i-lucide-rocket', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  meta: { icon: 'i-lucide-brain-circuit', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  // Legacy aliases
  research: { icon: 'i-lucide-search', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  task: { icon: 'i-lucide-hammer', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  feature: { icon: 'i-lucide-rocket', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
}

export const TEMPLATE_BADGE: Record<string, string> = {
  idea: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  discover: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  architect: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  generate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  compose: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  review: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  deploy: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  meta: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  // Legacy aliases
  research: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  task: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  feature: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
}

/** Template with icon/label/class for detail panel badges */
export const TEMPLATE_DISPLAY: Record<string, { icon: string; label: string; class: string }> = {
  idea: { icon: 'i-lucide-lightbulb', label: 'Idea', class: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  discover: { icon: 'i-lucide-search', label: 'Discover', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  architect: { icon: 'i-lucide-drafting-compass', label: 'Architect', class: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  generate: { icon: 'i-lucide-wand-sparkles', label: 'Generate', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  compose: { icon: 'i-lucide-hammer', label: 'Compose', class: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  review: { icon: 'i-lucide-eye', label: 'Review', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  deploy: { icon: 'i-lucide-rocket', label: 'Deploy', class: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  meta: { icon: 'i-lucide-brain-circuit', label: 'Meta', class: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  // Legacy aliases
  research: { icon: 'i-lucide-search', label: 'Research', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  task: { icon: 'i-lucide-hammer', label: 'Task', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  feature: { icon: 'i-lucide-rocket', label: 'Feature', class: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
}

/** Default step sequences per template */
export const TEMPLATE_STEPS: Record<string, string[]> = {
  idea: [],
  discover: ['analyse'],
  architect: ['analyst'],
  generate: ['analyst', 'builder', 'reviewer', 'merger'],
  compose: ['analyst', 'builder', 'reviewer', 'merger'],
  review: [],
  deploy: ['analyst', 'builder', 'launcher', 'reviewer', 'merger'],
  meta: ['analyst', 'builder', 'reviewer', 'merger'],
  // Legacy aliases
  research: ['analyse'],
  task: ['analyst', 'builder', 'reviewer', 'merger'],
  feature: ['analyst', 'builder', 'launcher', 'reviewer', 'merger'],
}

/** Template picker options (for dropdowns) */
export const TEMPLATE_OPTIONS = [
  { value: 'idea', label: 'Idea', icon: 'i-lucide-lightbulb' },
  { value: 'discover', label: 'Discover', icon: 'i-lucide-search' },
  { value: 'architect', label: 'Architect', icon: 'i-lucide-drafting-compass' },
  { value: 'generate', label: 'Generate', icon: 'i-lucide-wand-sparkles' },
  { value: 'compose', label: 'Compose', icon: 'i-lucide-hammer' },
  { value: 'review', label: 'Review', icon: 'i-lucide-eye' },
  { value: 'deploy', label: 'Deploy', icon: 'i-lucide-rocket' },
  { value: 'meta', label: 'Meta', icon: 'i-lucide-brain-circuit' },
]

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

/** Status config for UI display: lists, detail panels, share page */
export const WORKITEM_STATUS_DISPLAY: Record<string, { icon: string; label: string; class: string }> = {
  queued: { icon: 'i-lucide-circle-dashed', label: 'Queued', class: 'text-neutral-400' },
  active: { icon: 'i-lucide-loader-2', label: 'In progress', class: 'text-primary-500 animate-spin' },
  waiting: { icon: 'i-lucide-pause-circle', label: 'Waiting', class: 'text-amber-500' },
  done: { icon: 'i-lucide-check-circle', label: 'Done', class: 'text-green-500' },
  blocked: { icon: 'i-lucide-alert-circle', label: 'Blocked', class: 'text-red-500' },
  rejected: { icon: 'i-lucide-ban', label: 'Rejected', class: 'text-neutral-400' },
}

/** Status pill badge classes for summary bar */
export const WORKITEM_STATUS_PILL: Record<string, string> = {
  queued: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  active: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  waiting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  rejected: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
}

// ─── Signal Icons ───

export const SIGNAL_ICON: Record<string, { icon: string; class: string }> = {
  green: { icon: 'i-lucide-check-circle', class: 'text-green-500' },
  orange: { icon: 'i-lucide-pause-circle', class: 'text-amber-500' },
  red: { icon: 'i-lucide-alert-circle', class: 'text-red-500' },
}

// ─── Type Config (for VueFlow work-item cards) ───

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

/** Assignee picker options (for dropdowns) */
export const ASSIGNEE_OPTIONS = [
  { value: 'pi', label: 'Pi.dev', icon: 'i-lucide-bot' },
  { value: 'human', label: 'You', icon: 'i-lucide-user' },
  { value: 'client', label: 'Client', icon: 'i-lucide-users' },
  { value: 'ci', label: 'CI', icon: 'i-lucide-git-branch' },
]

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
  discover: { icon: 'i-lucide-search', label: 'Discover', class: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  architect: { icon: 'i-lucide-drafting-compass', label: 'Architect', class: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  compose: { icon: 'i-lucide-hammer', label: 'Compose', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  deploy: { icon: 'i-lucide-rocket', label: 'Deploy', class: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  meta: { icon: 'i-lucide-brain-circuit', label: 'Meta', class: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  // Legacy aliases
  research: { icon: 'i-lucide-search', label: 'Research', class: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  task: { icon: 'i-lucide-hammer', label: 'Task', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  feature: { icon: 'i-lucide-rocket', label: 'Feature', class: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
}

/** Status config for detail panel (icon + label + utility class) */
export const DETAIL_STATUS_CONFIG: Record<string, { icon: string; label: string; class: string }> = {
  queued: { icon: 'i-lucide-circle-dashed', label: 'Queued', class: 'text-neutral-400' },
  active: { icon: 'i-lucide-loader-2', label: 'Active', class: 'text-blue-500' },
  waiting: { icon: 'i-lucide-pause-circle', label: 'Waiting', class: 'text-amber-500' },
  done: { icon: 'i-lucide-check-circle', label: 'Done', class: 'text-green-500' },
  blocked: { icon: 'i-lucide-alert-circle', label: 'Blocked', class: 'text-red-500' },
}

// ─── Pipeline Stages & Labels ───

export const PIPELINE_STAGES = ['analyst', 'builder', 'launcher', 'reviewer', 'merger'] as const
export type PipelineStage = (typeof PIPELINE_STAGES)[number]

export const STAGE_LABELS: Record<string, string> = {
  analyst: 'A',
  builder: 'B',
  launcher: 'L',
  reviewer: 'R',
  merger: 'M',
  coach: 'C',
  analyse: 'An',
  synthesize: 'S',
  optimizer: 'O',
}

/** Full human-readable names for stage output history */
export const PIPELINE_STAGE_NAMES: Record<string, string> = {
  analyst: 'Analyst',
  builder: 'Builder',
  launcher: 'Launcher',
  reviewer: 'Reviewer',
  merger: 'Merger',
  coach: 'Coach',
  analyse: 'Analyse',
  synthesize: 'Synthesize',
  optimizer: 'Optimizer',
}

// ─── Pipeline Dot Computation ───

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

/** @deprecated Use computePipelineStages instead */
export function computePipelineDots(opts: {
  stage: string | null
  signal: string | null
  isWorking: boolean
}): PipelineDot[] {
  return computePipelineStages(opts.stage, opts.isWorking ? 'active' : null, opts.signal)
}

// ─── Connect-to-create node types ───

export const CONNECT_NODE_TYPES = [
  { id: 'idea', label: 'Idea', icon: 'i-lucide-lightbulb', color: 'text-violet-500' },
  { id: 'discover', label: 'Discover', icon: 'i-lucide-search', color: 'text-blue-500' },
  { id: 'architect', label: 'Architect', icon: 'i-lucide-drafting-compass', color: 'text-indigo-500' },
  { id: 'compose', label: 'Compose', icon: 'i-lucide-hammer', color: 'text-cyan-500' },
  { id: 'deploy', label: 'Deploy', icon: 'i-lucide-rocket', color: 'text-rose-500' },
  { id: 'meta', label: 'Meta', icon: 'i-lucide-brain-circuit', color: 'text-rose-500' },
]

// ─── Kanban Columns ───

export const KANBAN_COLUMNS = [
  { value: 'queued', label: 'Queued', color: 'neutral', icon: 'i-lucide-circle-dashed' },
  { value: 'active', label: 'Active', color: 'primary', icon: 'i-lucide-loader-2' },
  { value: 'waiting', label: 'Waiting', color: 'warning', icon: 'i-lucide-pause-circle' },
  { value: 'done', label: 'Done', color: 'success', icon: 'i-lucide-check-circle' },
  { value: 'blocked', label: 'Blocked', color: 'error', icon: 'i-lucide-alert-circle' },
]

// ─── Legacy compatibility ───

/** @deprecated Use TEMPLATE_CONFIG instead */
export const NODE_TYPE_CONFIG = TEMPLATE_CONFIG
/** @deprecated Use TEMPLATE_BADGE instead */
export const NODE_TYPE_BADGE = TEMPLATE_BADGE
/** @deprecated Use getTemplateConfig instead */
export function getNodeTypeConfig(nodeType: string): TemplateStyle { return getTemplateConfig(nodeType) }
/** @deprecated Use getTemplateBadge instead */
export function getNodeTypeBadge(nodeType: string): string { return getTemplateBadge(nodeType) }
