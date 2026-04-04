<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { ThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/types'
import { STATUS_CONFIG, getTemplateConfig, getTemplateBadge, STAGE_LABELS } from '~/utils/thinkgraph-config'

interface Props {
  data: Record<string, unknown>
  selected?: boolean
  dragging?: boolean
  label?: string
  collection?: string
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  dragging: false,
  label: '',
  collection: ''
})

// Support both canvas and project view actions
const projectActions = inject<{
  openDetail: (id: string) => void
  addChild: (parentId: string) => void
  dispatch: (id: string) => void
  openTerminal: (id: string) => void
  selectSubtree?: (nodeId: string) => void
  layoutSubtree?: (nodeId: string) => void
  openContextMenu?: (nodeId: string, event: MouseEvent) => void
} | null>('projectActions', null)

const isHovered = ref(false)
const node = computed(() => props.data as unknown as ThinkgraphNode)

const templateStyle = computed(() => getTemplateConfig(node.value.template || 'idea'))
const statusConfig = computed(() => STATUS_CONFIG[node.value.status] || STATUS_CONFIG.idle)

const ASSIGNEE_CONFIG: Record<string, { icon: string; label: string }> = {
  pi: { icon: 'i-lucide-bot', label: 'Pi' },
  human: { icon: 'i-lucide-user', label: 'You' },
  client: { icon: 'i-lucide-users', label: 'Client' },
  ci: { icon: 'i-lucide-git-branch', label: 'CI' },
}

// Pipeline — adapts to whatever steps the node has
const nodeSteps = computed(() => {
  const steps = node.value.steps
  return Array.isArray(steps) && steps.length > 0 ? steps : []
})
const hasPipeline = computed(() => nodeSteps.value.length > 0)
const currentStage = computed(() => node.value.stage || null)
const currentSignal = computed(() => node.value.signal || null)
const isWorking = computed(() => node.value.status === 'active' || node.value.status === 'working')
const isDone = computed(() => node.value.status === 'done')

const pipelineDots = computed(() => {
  const steps = nodeSteps.value
  if (steps.length === 0) return []
  const stage = currentStage.value
  const signal = currentSignal.value
  if (!stage) {
    return steps.map(s => ({ stage: s, label: STAGE_LABELS[s] || s[0].toUpperCase(), state: 'pending' as const }))
  }
  const currentIdx = steps.indexOf(stage)
  return steps.map((s, idx) => {
    const label = STAGE_LABELS[s] || s[0].toUpperCase()
    if (currentIdx >= 0 && idx < currentIdx) return { stage: s, label, state: 'done' as const }
    if (idx === currentIdx) {
      if (isWorking.value) return { stage: s, label, state: 'working' as const }
      if (signal === 'green') return { stage: s, label, state: 'green' as const }
      if (signal === 'orange') return { stage: s, label, state: 'orange' as const }
      if (signal === 'red') return { stage: s, label, state: 'red' as const }
      return { stage: s, label, state: 'current' as const }
    }
    return { stage: s, label, state: 'pending' as const }
  })
})

const assigneeConfig = computed(() => {
  const a = node.value.assignee || 'human'
  return ASSIGNEE_CONFIG[a] || ASSIGNEE_CONFIG.human
})

const displayTitle = computed(() => {
  const title = node.value.title || ''
  return title.length > 40 ? title.slice(0, 37) + '...' : title
})

// Live status (activity text from worker)
const liveStatus = computed(() => {
  const a = node.value.artifacts
  if (!Array.isArray(a)) return null
  return a.find((art: any) => art?.type === 'liveStatus') || null
})
const activityText = computed(() => liveStatus.value?.activity || null)

// Glanceable tags
const arts = computed(() => {
  const a = node.value.artifacts
  return Array.isArray(a) ? a : []
})
const hasPR = computed(() => arts.value.some((a: any) => a?.type === 'pr'))
const ciStatus = computed(() => (arts.value.find((a: any) => a?.type === 'ci') as any)?.status || null)
const isWaitingHuman = computed(() => node.value.status === 'waiting' && node.value.assignee === 'human')

const tags = computed(() => {
  const t: Array<{ emoji: string; title: string }> = []
  if (hasPR.value) t.push({ emoji: '\u{1F500}', title: 'Has PR' })
  if (node.value.worktree) t.push({ emoji: '\u{1F527}', title: 'Worktree set' })
  if (ciStatus.value === 'pass') t.push({ emoji: '\u2705', title: 'CI passed' })
  if (ciStatus.value === 'fail') t.push({ emoji: '\u274C', title: 'CI failed' })
  if (isWaitingHuman.value) t.push({ emoji: '\u{1F440}', title: 'Waiting for you' })
  if (node.value.starred) t.push({ emoji: '\u2B50', title: 'Starred' })
  return t
})

// Touch device detection
const isTouchDevice = ref(false)
if (import.meta.client) {
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

function handleDetail(event: Event) {
  event.stopPropagation()
  if (node.value.id) projectActions?.openDetail(node.value.id)
}

function handleAddChild(event: Event) {
  event.stopPropagation()
  if (node.value.id) projectActions?.addChild(node.value.id)
}

function handleDispatch(event: Event) {
  event.stopPropagation()
  if (node.value.id) projectActions?.dispatch(node.value.id)
}

function handleSelectSubtree(event: Event) {
  event.stopPropagation()
  if (node.value.id) projectActions?.selectSubtree?.(node.value.id)
}

function handleLayoutSubtree(event: Event) {
  event.stopPropagation()
  if (node.value.id) projectActions?.layoutSubtree?.(node.value.id)
}

function handleContextMenu(event: MouseEvent | Event) {
  event.preventDefault()
  event.stopPropagation()
  if (!node.value.id) return
  const mouseEvent = 'clientX' in event ? event as MouseEvent : {
    clientX: (event.target as HTMLElement)?.getBoundingClientRect().right ?? 0,
    clientY: (event.target as HTMLElement)?.getBoundingClientRect().top ?? 0,
  } as MouseEvent
  projectActions?.openContextMenu?.(node.value.id, mouseEvent)
}
</script>

<template>
  <div
    class="node-card group"
    :class="[
      `node-card--${node.template || 'idea'}`,
      { 'node-card--selected': selected, 'node-card--dragging': dragging, 'node-card--done': isDone },
      statusConfig.class,
    ]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @contextmenu="handleContextMenu"
  >
    <Handle type="target" :position="Position.Top" class="node-handle" />

    <!-- Header: status + assignee -->
    <div class="flex items-center gap-1 mb-1 opacity-70">
      <UIcon :name="templateStyle.icon" class="size-3" />
      <UIcon
        :name="statusConfig.icon || 'i-lucide-circle'"
        class="size-3"
        :class="{ 'animate-spin': isWorking }"
      />
      <span class="ml-auto">
        <UIcon :name="assigneeConfig.icon" class="size-3" />
      </span>
    </div>

    <!-- Pipeline LEDs — adapts to node's step count (1 dot, 3 dots, 5 dots) -->
    <div v-if="hasPipeline" class="led-strip">
      <div
        v-for="dot in pipelineDots"
        :key="dot.stage"
        class="led"
        :class="`led--${dot.state}`"
        :title="`${dot.stage}: ${dot.state}`"
      />
    </div>

    <!-- Title -->
    <p class="text-[10px] font-medium leading-snug line-clamp-2">
      {{ displayTitle }}
    </p>

    <!-- Live activity text (while worker is running) -->
    <p v-if="isWorking && activityText" class="text-[10px] leading-tight opacity-70 mt-0.5 truncate">
      {{ activityText }}
    </p>

    <!-- Glanceable tags -->
    <div v-if="tags.length" class="flex items-center gap-0.5 mt-1">
      <span
        v-for="tag in tags"
        :key="tag.emoji"
        :title="tag.title"
        class="text-[10px] leading-none select-none cursor-default"
      >{{ tag.emoji }}</span>
    </div>

    <!-- Progress bar (active only) -->
    <div
      v-if="isWorking"
      class="mt-1.5 h-0.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden"
    >
      <div class="h-full bg-primary-500 rounded-full animate-progress" />
    </div>

    <!-- Dispatch button — only for nodes with pipeline steps -->
    <button
      v-if="hasPipeline && projectActions"
      class="node-card__dispatch"
      :class="{ 'node-card__dispatch--disabled': isWorking || isDone }"
      :disabled="isWorking || isDone"
      title="Dispatch work"
      @click.stop="handleDispatch"
    >
      <UIcon name="i-lucide-send" class="size-3" />
    </button>

    <!-- Secondary actions (hover) -->
    <div class="node-card__actions" :class="{ 'opacity-0 group-hover:opacity-100': !isTouchDevice }">
      <button class="node-card__action" title="Select subtree" @click.stop="handleSelectSubtree">
        <UIcon name="i-lucide-git-fork" class="size-3.5" />
      </button>
      <button class="node-card__action" title="Layout subtree" @click.stop="handleLayoutSubtree">
        <UIcon name="i-lucide-layout-grid" class="size-3.5" />
      </button>
      <button class="node-card__action" title="Add child" @click.stop="handleAddChild">
        <UIcon name="i-lucide-plus" class="size-3.5" />
      </button>
      <button class="node-card__action" title="Open detail" @click.stop="handleDetail">
        <UIcon name="i-lucide-panel-right-open" class="size-3.5" />
      </button>
      <button class="node-card__action" title="More" @click.stop="handleContextMenu">
        <UIcon name="i-lucide-ellipsis" class="size-3.5" />
      </button>
    </div>

    <Handle type="source" :position="Position.Bottom" class="node-handle" />
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.node-card {
  @apply px-2.5 py-2 rounded-md transition-all duration-150;
  @apply min-w-[120px] max-w-[180px];
  @apply relative;
  @apply border-0 shadow-none;
}

/* Post-it colors per template */
.node-card--idea { background: #f3e8ff; color: #581c87; }
.node-card--research { background: #dbeafe; color: #1e3a5f; }
.node-card--task { background: #fef3c7; color: #78350f; }
.node-card--feature { background: #cffafe; color: #164e63; }
.node-card--meta { background: #ffe4e6; color: #881337; }

:root.dark .node-card--idea { background: #3b0764; color: #e9d5ff; }
:root.dark .node-card--research { background: #1e3a5f; color: #bfdbfe; }
:root.dark .node-card--task { background: #451a03; color: #fde68a; }
:root.dark .node-card--feature { background: #164e63; color: #a5f3fc; }
:root.dark .node-card--meta { background: #4c0519; color: #fecdd3; }

.node-card--selected {
  @apply ring-2 ring-offset-1;
  --tw-ring-color: var(--color-primary-500);
}

.node-card--dragging {
  @apply shadow-lg scale-105 cursor-grabbing;
}

.node-card--done {
  @apply opacity-70 scale-95;
}

/* Status-based animations */
.work-node--working {
  animation: pulse-node 2s ease-in-out infinite;
  @apply shadow-md;
}

.work-node--attention {
  @apply shadow-sm;
  outline: 2px dashed rgba(251, 146, 60, 0.6);
  outline-offset: 2px;
}

.work-node--blocked {
  @apply opacity-40;
  background: #fecaca !important;
  color: #7f1d1d !important;
  text-decoration: line-through;
}

:root.dark .work-node--blocked {
  background: #450a0a !important;
  color: #fca5a5 !important;
}

.work-node--queued {
  @apply opacity-70;
}

.work-node--error {
  animation: pulse-error 1.5s ease-in-out infinite;
}

@keyframes pulse-node {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
  50% { box-shadow: 0 0 8px 2px rgba(99, 102, 241, 0.15); }
}

@keyframes pulse-error {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  50% { box-shadow: 0 0 8px 2px rgba(239, 68, 68, 0.2); }
}

@keyframes progress {
  0% { width: 0%; margin-left: 0; }
  50% { width: 60%; margin-left: 20%; }
  100% { width: 0%; margin-left: 100%; }
}

.animate-progress {
  animation: progress 2s ease-in-out infinite;
}

/* LED strip — physical device aesthetic */
.led-strip {
  @apply flex items-center gap-1.5 mb-1;
}

.led {
  @apply size-2 rounded-full;
  @apply transition-all duration-500;
  /* Recessed bezel — looks like a physical LED housing */
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.3), 0 0.5px 0 rgba(255,255,255,0.1);
}

.led--pending { background: rgba(0,0,0,0.2); }

.led--current {
  background: rgba(255,255,255,0.15);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.3), 0 0 2px rgba(255,255,255,0.1);
}

.led--done {
  background: #10b981;
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 0 4px #10b981, 0 0 8px rgba(16,185,129,0.4);
}

.led--working {
  background: #10b981;
  animation: led-pulse 1.5s ease-in-out infinite;
}

.led--green {
  background: #10b981;
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 0 4px #10b981, 0 0 8px rgba(16,185,129,0.4);
}

.led--orange {
  background: #f59e0b;
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 0 4px #f59e0b, 0 0 8px rgba(245,158,11,0.4);
}

.led--red {
  background: #ef4444;
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 0 4px #ef4444, 0 0 8px rgba(239,68,68,0.4);
}

@keyframes led-pulse {
  0%, 100% {
    opacity: 0.5;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.3), 0 0 2px rgba(16,185,129,0.2);
  }
  50% {
    opacity: 1;
    box-shadow: inset 0 1px 1px rgba(255,255,255,0.2), 0 0 6px #10b981, 0 0 12px rgba(16,185,129,0.5);
  }
}

.node-handle {
  @apply w-3 h-3 rounded-full;
  @apply bg-neutral-400/60;
  @apply border border-white dark:border-neutral-800;
  @apply transition-all duration-150;
}

.node-handle:hover {
  @apply w-4 h-4;
  background-color: var(--color-primary-500);
}

.node-card__dispatch {
  @apply absolute -bottom-2 -right-2 z-10;
  @apply w-5 h-5 rounded-full flex items-center justify-center;
  @apply bg-white/90 dark:bg-neutral-700/90 backdrop-blur-sm;
  @apply shadow-sm cursor-pointer transition-all duration-150;
  @apply text-neutral-400 hover:scale-110;
  &:hover { color: var(--color-primary-500); }
}

.node-card__dispatch--disabled {
  @apply opacity-30 cursor-not-allowed;
  &:hover { transform: none; color: inherit; }
}

.node-card__actions {
  @apply absolute -top-2 -right-2 flex gap-1 z-10;
}

.node-card__action {
  @apply w-5 h-5 rounded-full flex items-center justify-center;
  @apply bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm;
  @apply shadow-sm cursor-pointer transition-all duration-150;
  @apply text-neutral-500 hover:scale-110;
  &:hover { color: var(--color-primary-500); }
}
</style>
