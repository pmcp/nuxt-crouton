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
  error: { class: 'work-node--error', icon: 'i-lucide-x-circle' },
}

// ─── Pipeline Step Labels ───

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
