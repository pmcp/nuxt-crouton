/**
 * Shared ThinkGraph configuration constants.
 * Single source of truth for node types, path types, statuses, and expand modes.
 */

// ─── Node Type Config ───
// Used by: ThinkgraphDecisionsNode, ThinkingPathPanel, ContextInspector, GraphFilters

export interface NodeTypeStyle {
  icon: string
  color: string
  bg: string
}

export const NODE_TYPE_CONFIG: Record<string, NodeTypeStyle> = {
  // Thinking types
  idea: { icon: 'i-lucide-lightbulb', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  insight: { icon: 'i-lucide-eye', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  decision: { icon: 'i-lucide-check-circle', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  question: { icon: 'i-lucide-help-circle', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  // Planning types
  epic: { icon: 'i-lucide-mountain', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  user_story: { icon: 'i-lucide-user', color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20' },
  task: { icon: 'i-lucide-square-check', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  // Execution types
  milestone: { icon: 'i-lucide-flag', color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
  remark: { icon: 'i-lucide-message-circle', color: 'text-neutral-500', bg: 'bg-neutral-50 dark:bg-neutral-800/50' },
  fork: { icon: 'i-lucide-git-fork', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  send: { icon: 'i-lucide-send', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
}

/** Get node type badge color classes (for inline badges in ThinkgraphDecisionsNode) */
export const NODE_TYPE_BADGE: Record<string, string> = {
  idea: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  insight: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  decision: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  question: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  epic: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  user_story: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  task: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  milestone: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  remark: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400',
  fork: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  send: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
}

export function getNodeTypeConfig(nodeType: string): NodeTypeStyle {
  return NODE_TYPE_CONFIG[nodeType] || NODE_TYPE_CONFIG.insight
}

export function getNodeTypeBadge(nodeType: string): string {
  return NODE_TYPE_BADGE[nodeType] || NODE_TYPE_BADGE.insight
}

// ─── Path Type Config ───

export const PATH_TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  diverge: { icon: 'i-lucide-git-branch-plus', color: 'text-green-500' },
  deep_dive: { icon: 'i-lucide-microscope', color: 'text-blue-500' },
  prototype: { icon: 'i-lucide-hammer', color: 'text-orange-500' },
  converge: { icon: 'i-lucide-git-merge', color: 'text-purple-500' },
  validate: { icon: 'i-lucide-shield-question', color: 'text-yellow-500' },
  park: { icon: 'i-lucide-archive', color: 'text-neutral-400' },
}

// ─── Status Config ───

export const STATUS_CONFIG: Record<string, { class: string; icon: string }> = {
  idle: { class: '', icon: '' },
  draft: { class: 'decision-node--draft', icon: 'i-lucide-pencil-line' },
  thinking: { class: 'decision-node--thinking', icon: 'i-lucide-brain' },
  working: { class: 'decision-node--working', icon: 'i-lucide-loader-2' },
  blocked: { class: 'decision-node--blocked', icon: 'i-lucide-pause-circle' },
  needs_attention: { class: 'decision-node--attention', icon: 'i-lucide-alert-triangle' },
  done: { class: 'decision-node--done', icon: 'i-lucide-check-circle-2' },
  error: { class: 'decision-node--error', icon: 'i-lucide-x-circle' },
}

// ─── Expand Modes ───

export const EXPAND_MODES = [
  { id: 'default', label: 'Quick expand', icon: 'i-lucide-sparkles', description: '3 diverse perspectives' },
  { id: 'diverge', label: 'Diverge', icon: 'i-lucide-git-branch-plus', description: '5 alternative approaches' },
  { id: 'deep_dive', label: 'Deep dive', icon: 'i-lucide-microscope', description: 'Implications & edge cases' },
  { id: 'prototype', label: 'Prototype', icon: 'i-lucide-hammer', description: 'Practical, actionable steps' },
  { id: 'converge', label: 'Converge', icon: 'i-lucide-git-merge', description: 'Synthesize into strategy' },
  { id: 'validate', label: 'Challenge', icon: 'i-lucide-shield-question', description: 'Find holes & risks' },
] as const

// ─── Connect-to-create Node Types ───

export const CONNECT_NODE_TYPES = [
  // Thinking types
  { id: 'idea', label: 'Idea', icon: 'i-lucide-lightbulb', color: 'text-emerald-500' },
  { id: 'insight', label: 'Insight', icon: 'i-lucide-eye', color: 'text-blue-500' },
  { id: 'decision', label: 'Decision', icon: 'i-lucide-check-circle', color: 'text-purple-500' },
  { id: 'question', label: 'Question', icon: 'i-lucide-help-circle', color: 'text-amber-500' },
  // Planning types
  { id: 'epic', label: 'Epic', icon: 'i-lucide-mountain', color: 'text-rose-500' },
  { id: 'user_story', label: 'User Story', icon: 'i-lucide-user', color: 'text-sky-500' },
  { id: 'task', label: 'Task', icon: 'i-lucide-square-check', color: 'text-indigo-500' },
  // Execution types
  { id: 'milestone', label: 'Milestone', icon: 'i-lucide-flag', color: 'text-teal-500' },
  { id: 'remark', label: 'Remark', icon: 'i-lucide-message-circle', color: 'text-neutral-500' },
  { id: 'fork', label: 'Fork', icon: 'i-lucide-git-fork', color: 'text-orange-500' },
  { id: 'send', label: 'Send', icon: 'i-lucide-send', color: 'text-cyan-500' },
] as const

// ─── Filter Node Types (for GraphFilters sidebar) ───

export const FILTER_NODE_TYPES = [
  { id: 'idea', label: 'Idea', color: 'bg-emerald-500' },
  { id: 'insight', label: 'Insight', color: 'bg-blue-500' },
  { id: 'decision', label: 'Decision', color: 'bg-purple-500' },
  { id: 'question', label: 'Question', color: 'bg-amber-500' },
  { id: 'epic', label: 'Epic', color: 'bg-indigo-500' },
  { id: 'user_story', label: 'User Story', color: 'bg-cyan-500' },
  { id: 'task', label: 'Task', color: 'bg-teal-500' },
  { id: 'milestone', label: 'Milestone', color: 'bg-rose-500' },
  { id: 'remark', label: 'Remark', color: 'bg-neutral-500' },
  { id: 'fork', label: 'Fork', color: 'bg-orange-500' },
  { id: 'send', label: 'Send', color: 'bg-sky-500' },
] as const

export const FILTER_PATH_TYPES = [
  { id: 'diverge', label: 'Diverge', icon: 'i-lucide-git-branch-plus' },
  { id: 'deep_dive', label: 'Deep dive', icon: 'i-lucide-microscope' },
  { id: 'prototype', label: 'Prototype', icon: 'i-lucide-hammer' },
  { id: 'converge', label: 'Converge', icon: 'i-lucide-git-merge' },
  { id: 'validate', label: 'Validate', icon: 'i-lucide-shield-question' },
  { id: 'park', label: 'Park', icon: 'i-lucide-archive' },
] as const
