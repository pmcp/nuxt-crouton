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

const canvasActions = inject<{
  openCreate: (template: string, parentId?: string) => void
  openDetail: (nodeId: string) => void
  openPathType: (parentId?: string) => void
  openTerminal: (nodeId: string) => void
  setStatus: (nodeId: string, status: string) => Promise<void>
  deleteNode: (nodeId: string) => Promise<void>
  copyContext: (nodeId: string) => Promise<void>
  openContextMenu: (nodeId: string, event: MouseEvent) => void
} | null>('canvasActions', null)

// Also support project view actions (injected from project page)
const projectActions = inject<{
  openDetail: (id: string) => void
  addChild: (parentId: string) => void
  dispatch: (id: string) => void
  openTerminal: (id: string) => void
} | null>('projectActions', null)

const isHovered = ref(false)

const node = computed(() => props.data as unknown as ThinkgraphNode)

const templateStyle = computed(() => getTemplateConfig(node.value.template || 'idea'))
const templateBadge = computed(() => getTemplateBadge(node.value.template || 'idea'))
const statusConfig = computed(() => STATUS_CONFIG[node.value.status] || STATUS_CONFIG.idle)

const isDraft = computed(() => node.value.status === 'draft')
const isDone = computed(() => node.value.status === 'done')
const isWorking = computed(() => node.value.status === 'working' || node.value.status === 'active')
const isThinking = computed(() => node.value.status === 'thinking')

// Pipeline — adapts to whatever steps the node has
const nodeSteps = computed(() => {
  const steps = node.value.steps
  return Array.isArray(steps) && steps.length > 0 ? steps : []
})
const hasPipeline = computed(() => nodeSteps.value.length > 0)
const currentStage = computed(() => node.value.stage || null)
const currentSignal = computed(() => node.value.signal || null)

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

const displayTitle = computed(() => {
  const title = node.value.title || ''
  return title.length > 60 ? title.slice(0, 57) + '...' : title
})

const hasOutput = computed(() => !!node.value.output)
const hasBrief = computed(() => !!node.value.brief)
const hasWorktree = computed(() => !!node.value.worktree)

// Depth-based left accent color
const DEPTH_COLORS = ['#f43f5e', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899']
const depthAccent = computed(() => {
  const depth = (node.value as any).depth ?? 0
  return DEPTH_COLORS[depth % DEPTH_COLORS.length]
})

const originIcon = computed(() => {
  switch (node.value.origin) {
    case 'ai': return 'i-lucide-sparkles'
    case 'human': return 'i-lucide-user'
    case 'mcp': return 'i-lucide-plug'
    case 'notion': return 'i-lucide-arrow-down-circle'
    default: return null
  }
})

function handleEdit(event: Event) {
  event.stopPropagation()
  if (node.value.id) {
    canvasActions?.openDetail(node.value.id)
    projectActions?.openDetail(node.value.id)
  }
}

function handleAddChild(event: Event) {
  event.stopPropagation()
  if (node.value.id) {
    canvasActions?.openCreate('idea', node.value.id)
    projectActions?.addChild(node.value.id)
  }
}

function handleContextMenu(event: MouseEvent | Event) {
  event.preventDefault()
  event.stopPropagation()
  if (node.value.id && canvasActions) {
    const mouseEvent = 'clientX' in event ? event as MouseEvent : {
      clientX: (event.target as HTMLElement)?.getBoundingClientRect().right ?? 0,
      clientY: (event.target as HTMLElement)?.getBoundingClientRect().top ?? 0,
    } as MouseEvent
    canvasActions.openContextMenu(node.value.id, mouseEvent)
  }
}

function handleDispatch(event: Event) {
  event.stopPropagation()
  if (node.value.id) projectActions?.dispatch(node.value.id)
}

// Touch device detection for always-visible action buttons
const isTouchDevice = ref(false)
if (import.meta.client) {
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0
}
</script>

<template>
  <div
    class="work-node group"
    :class="[
      {
        'work-node--selected': selected,
        'work-node--dragging': dragging,
      },
      statusConfig.class,
    ]"
    :style="{ borderLeftColor: depthAccent, borderLeftWidth: '3px' }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @contextmenu="handleContextMenu"
  >
    <Handle type="target" :position="Position.Top" class="work-handle" />

    <!-- Header: template badge + status + origin -->
    <div class="flex items-center gap-1.5 mb-1.5">
      <span
        class="text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5"
        :class="templateBadge"
      >
        <UIcon :name="templateStyle.icon" class="size-3" />
        {{ node.template || 'idea' }}
      </span>

      <span v-if="statusConfig.icon" class="inline-flex items-center">
        <UIcon
          :name="statusConfig.icon"
          class="size-3.5"
          :class="{
            'text-neutral-400 dark:text-neutral-500': node.status === 'draft',
            'text-blue-400 animate-pulse': node.status === 'thinking',
            'text-primary-500 animate-spin': isWorking,
            'text-orange-500': node.status === 'needs_attention' || node.status === 'waiting',
            'text-green-500': node.status === 'done',
            'text-red-500': node.status === 'error',
          }"
        />
      </span>

      <UIcon
        v-if="originIcon"
        :name="originIcon"
        class="size-3 ml-auto"
        :class="{
          'text-violet-400': node.origin === 'ai',
          'text-blue-400': node.origin === 'human',
          'text-neutral-400': node.origin === 'notion' || node.origin === 'mcp',
        }"
      />

      <!-- Starred indicator -->
      <span v-if="node.starred" class="text-[10px] ml-auto">&#x2B50;</span>
    </div>

    <!-- Pipeline LEDs — adapts to node's step count -->
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
    <p class="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-snug">
      {{ displayTitle }}
    </p>

    <!-- Brief preview (when no output yet) -->
    <p
      v-if="hasBrief && !hasOutput"
      class="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug line-clamp-2"
    >
      {{ node.brief }}
    </p>

    <!-- Bottom indicators -->
    <div class="mt-2 flex items-center gap-1.5 flex-wrap">
      <span v-if="hasWorktree" class="inline-flex items-center gap-0.5 text-[10px] text-teal-500">
        <UIcon name="i-lucide-git-branch" class="size-3" />
        worktree
      </span>
      <span v-if="hasOutput" class="inline-flex items-center gap-0.5 text-[10px] text-green-500">
        <UIcon name="i-lucide-file-check" class="size-3" />
        output
      </span>
      <span v-if="node.assignee && node.assignee !== 'human'" class="inline-flex items-center gap-0.5 text-[10px] text-neutral-400 ml-auto">
        <UIcon name="i-lucide-bot" class="size-3" />
        {{ node.assignee }}
      </span>
    </div>

    <!-- Progress bar for working status -->
    <div
      v-if="isWorking || isThinking"
      class="mt-2 h-0.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden"
    >
      <div class="h-full bg-primary-500 rounded-full animate-progress" />
    </div>

    <!-- Terminal indicator -->
    <button
      v-if="(isWorking || isThinking) && (canvasActions || projectActions)"
      class="mt-1.5 inline-flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 cursor-pointer transition-colors"
      title="Watch terminal"
      @click.stop="(canvasActions || projectActions)?.openTerminal(node.id)"
    >
      <UIcon name="i-lucide-terminal" class="size-3 animate-pulse" />
      <span>terminal</span>
    </button>

    <!-- Dispatch button — only for nodes with pipeline steps -->
    <button
      v-if="hasPipeline && projectActions"
      class="work-node__dispatch"
      :class="{ 'work-node__dispatch--disabled': isWorking || isDone }"
      :disabled="isWorking || isDone"
      title="Dispatch work"
      @click.stop="handleDispatch"
    >
      <UIcon name="i-lucide-send" class="size-3" />
    </button>

    <!-- Node actions (hover on desktop, always visible on touch) -->
    <div class="work-node__actions" :class="{ 'opacity-0 group-hover:opacity-100': !isTouchDevice }">
      <button class="work-node__action" title="Add child" @click.stop="handleAddChild">
        <UIcon name="i-lucide-plus" class="size-3.5" />
      </button>
      <button class="work-node__action" title="Open detail" @click.stop="handleEdit">
        <UIcon name="i-lucide-panel-right-open" class="size-3.5" />
      </button>
      <button v-if="canvasActions" class="work-node__action" title="More actions" @click.stop="handleContextMenu">
        <UIcon name="i-lucide-ellipsis" class="size-3.5" />
      </button>
    </div>

    <Handle type="source" :position="Position.Bottom" class="work-handle" />
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.work-node {
  @apply px-3 py-2.5 rounded-lg border bg-white dark:bg-neutral-900;
  @apply border-neutral-200 dark:border-neutral-700;
  @apply shadow-sm transition-all duration-150;
  @apply min-w-[180px] max-w-[260px];
  @apply relative;
}

.work-node--selected {
  @apply ring-2;
  border-color: var(--color-primary-500);
  --tw-ring-color: color-mix(in srgb, var(--color-primary-500) 20%, transparent);
}

.work-node--dragging { @apply shadow-lg scale-105 cursor-grabbing; }
.work-node--draft { @apply border-dashed opacity-75; }
.work-node--done { @apply border-green-300 dark:border-green-700; }
.work-node--queued { @apply opacity-70; }
.work-node--thinking { animation: pulse-slow 2s ease-in-out infinite; }
.work-node--working {
  animation: pulse-work 1.5s ease-in-out infinite;
  border-color: var(--color-primary-400);
}
.work-node--blocked { @apply border-neutral-400 dark:border-neutral-500 opacity-80; }
.work-node--attention { animation: glow-attention 2s ease-in-out infinite; }
.work-node--error {
  animation: pulse-error 1.5s ease-in-out infinite;
  @apply border-red-400 dark:border-red-600;
}

@keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
@keyframes pulse-work {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-primary-500) 30%, transparent); }
  50% { box-shadow: 0 0 12px 2px color-mix(in srgb, var(--color-primary-500) 15%, transparent); }
}
@keyframes glow-attention {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 146, 60, 0); }
  50% { box-shadow: 0 0 12px 2px rgba(251, 146, 60, 0.3); }
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

.animate-progress { animation: progress 2s ease-in-out infinite; }

/* LED strip — physical device aesthetic */
.led-strip { @apply flex items-center gap-1.5 mb-1; }
.led {
  @apply size-2 rounded-full transition-all duration-500;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.3), 0 0.5px 0 rgba(255,255,255,0.1);
}
.led--pending { background: rgba(0,0,0,0.2); }
.led--current { background: rgba(255,255,255,0.15); }
.led--done { background: #10b981; box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 0 4px #10b981; }
.led--working { background: #10b981; animation: led-pulse 1.5s ease-in-out infinite; }
.led--green { background: #10b981; box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 0 4px #10b981; }
.led--orange { background: #f59e0b; box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 0 4px #f59e0b; }
.led--red { background: #ef4444; box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 0 4px #ef4444; }

@keyframes led-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; box-shadow: inset 0 1px 1px rgba(255,255,255,0.2), 0 0 6px #10b981; }
}

.work-handle {
  @apply w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500;
  @apply border border-white dark:border-neutral-800 transition-colors;
}
.work-handle:hover { background-color: var(--color-primary-500); }

.work-node__dispatch {
  @apply absolute -bottom-2 -right-2 z-10;
  @apply w-5 h-5 rounded-full flex items-center justify-center;
  @apply bg-white/90 dark:bg-neutral-700/90 backdrop-blur-sm;
  @apply shadow-sm cursor-pointer transition-all duration-150;
  @apply text-neutral-400 hover:scale-110;
  &:hover { color: var(--color-primary-500); }
}
.work-node__dispatch--disabled {
  @apply opacity-30 cursor-not-allowed;
  &:hover { transform: none; color: inherit; }
}

.work-node__actions { @apply absolute -top-2 -right-2 flex gap-1 z-10; }
.work-node__action {
  @apply w-6 h-6 rounded-full flex items-center justify-center;
  @apply bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600;
  @apply shadow-sm cursor-pointer transition-all duration-150;
  @apply text-neutral-500 hover:scale-110;
  &:hover { color: var(--color-primary-500); }
}
</style>
