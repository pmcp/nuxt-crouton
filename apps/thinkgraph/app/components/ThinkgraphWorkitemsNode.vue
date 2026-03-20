<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { ThinkgraphWorkItem } from '~~/layers/thinkgraph/collections/workitems/types'

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

const projectActions = inject<{
  openDetail: (id: string) => void
  addChild: (parentId: string) => void
  dispatch: (id: string) => void
  openTerminal: (id: string) => void
} | null>('projectActions', null)

const isHovered = ref(false)

const item = computed(() => props.data as unknown as ThinkgraphWorkItem)

// Type config
const TYPE_CONFIG: Record<string, { icon: string; color: string; badge: string }> = {
  discover: {
    icon: 'i-lucide-search',
    color: 'text-violet-500',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
  },
  architect: {
    icon: 'i-lucide-pencil-ruler',
    color: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  },
  generate: {
    icon: 'i-lucide-hammer',
    color: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  },
  compose: {
    icon: 'i-lucide-layout',
    color: 'text-cyan-500',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
  },
  review: {
    icon: 'i-lucide-eye',
    color: 'text-green-500',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  },
  deploy: {
    icon: 'i-lucide-rocket',
    color: 'text-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
  },
}

const STATUS_CONFIG: Record<string, { icon: string; class: string }> = {
  queued: { icon: 'i-lucide-circle-dashed', class: 'work-item--queued' },
  active: { icon: 'i-lucide-loader-2', class: 'work-item--active' },
  waiting: { icon: 'i-lucide-pause-circle', class: 'work-item--waiting' },
  done: { icon: 'i-lucide-check-circle', class: 'work-item--done' },
  blocked: { icon: 'i-lucide-alert-circle', class: 'work-item--blocked' },
}

const ASSIGNEE_CONFIG: Record<string, { icon: string; label: string }> = {
  pi: { icon: 'i-lucide-bot', label: 'Pi' },
  human: { icon: 'i-lucide-user', label: 'You' },
  client: { icon: 'i-lucide-users', label: 'Client' },
}

const PIPELINE_STAGES = ['analyst', 'builder', 'reviewer', 'merger'] as const

const STAGE_LABELS: Record<string, string> = {
  analyst: 'A',
  builder: 'B',
  reviewer: 'R',
  merger: 'M',
}

const typeConfig = computed(() => TYPE_CONFIG[item.value.type] || TYPE_CONFIG.generate)
const statusConfig = computed(() => STATUS_CONFIG[item.value.status] || STATUS_CONFIG.queued)

// Pipeline stage tracking
const currentStage = computed(() => item.value.stage || null)
const currentSignal = computed(() => item.value.signal || null)
const hasPipeline = computed(() => !!currentStage.value)
const isWorking = computed(() => item.value.status === 'active')

/** Get the visual state for each pipeline dot */
const pipelineDots = computed(() => {
  const stage = currentStage.value
  const signal = currentSignal.value
  if (!stage) {
    // No pipeline started yet — all LEDs off
    return PIPELINE_STAGES.map(s => ({ stage: s, label: STAGE_LABELS[s], state: 'pending' as const }))
  }

  const currentIdx = PIPELINE_STAGES.indexOf(stage as any)

  return PIPELINE_STAGES.map((s, idx) => {
    // Past stages (before current) — completed green
    if (idx < currentIdx) {
      return { stage: s, label: STAGE_LABELS[s], state: 'done' as const }
    }
    // Current stage
    if (idx === currentIdx) {
      if (isWorking.value) return { stage: s, label: STAGE_LABELS[s], state: 'working' as const }
      if (signal === 'green') return { stage: s, label: STAGE_LABELS[s], state: 'green' as const }
      if (signal === 'orange') return { stage: s, label: STAGE_LABELS[s], state: 'orange' as const }
      if (signal === 'red') return { stage: s, label: STAGE_LABELS[s], state: 'red' as const }
      return { stage: s, label: STAGE_LABELS[s], state: 'current' as const }
    }
    // Future stages — dim
    return { stage: s, label: STAGE_LABELS[s], state: 'pending' as const }
  })
})

const assigneeConfig = computed(() => {
  const a = item.value.assignee || 'pi'
  if (a.startsWith('api:')) {
    return { icon: 'i-lucide-zap', label: a.replace('api:', '') }
  }
  return ASSIGNEE_CONFIG[a] || ASSIGNEE_CONFIG.pi
})

const isActive = computed(() => item.value.status === 'active')
const isDone = computed(() => item.value.status === 'done')

const displayTitle = computed(() => {
  const title = item.value.title || ''
  return title.length > 60 ? title.slice(0, 57) + '...' : title
})

const hasOutput = computed(() => !!item.value.output)
const hasBrief = computed(() => !!item.value.brief)
const hasWorktree = computed(() => !!item.value.worktree)
const hasDeployUrl = computed(() => !!item.value.deployUrl)
const hasRetrospective = computed(() => !!item.value.retrospective)

// Sibling items for child detection
const allItems = inject<Ref<ThinkgraphWorkItem[]>>('projectItems', ref([]))

// Glanceable tags
const arts = computed(() => {
  const a = item.value.artifacts
  return Array.isArray(a) ? a : []
})

const hasPR = computed(() => arts.value.some((a: any) => a?.type === 'pr'))

const ciArtifact = computed(() => arts.value.find((a: any) => a?.type === 'ci') as any)
const ciStatus = computed(() => ciArtifact.value?.status || null) // 'pass' | 'fail' | null

const hasOpenQuestions = computed(() => {
  // Check children that are question-type or review with question scope
  return allItems.value.some(
    (i) => i.parentId === item.value.id && i.type === 'review' && i.status !== 'done' && i.title?.startsWith('[')
      && (i.title?.includes('question') || i.brief?.includes('?'))
  )
})

const hasLearningChildren = computed(() => {
  return allItems.value.some(
    (i) => i.parentId === item.value.id && i.type === 'review' && i.assignee === 'human'
  )
})

const isWaitingHuman = computed(() => item.value.status === 'waiting' && item.value.assignee === 'human')

const tags = computed(() => {
  const t: Array<{ emoji: string; title: string }> = []
  if (hasPR.value) t.push({ emoji: '🔀', title: 'Has PR' })
  if (hasWorktree.value) t.push({ emoji: '🔧', title: 'Worktree set' })
  if (hasOpenQuestions.value) t.push({ emoji: '❓', title: 'Open questions' })
  if (hasLearningChildren.value) t.push({ emoji: '💡', title: 'Has learnings' })
  if (ciStatus.value === 'pass') t.push({ emoji: '✅', title: 'CI passed' })
  if (ciStatus.value === 'fail') t.push({ emoji: '❌', title: 'CI failed' })
  if (isWaitingHuman.value) t.push({ emoji: '👀', title: 'Waiting for you' })
  return t
})

// Live status from artifacts
const handoff = computed(() => {
  const arts = item.value.artifacts
  if (!Array.isArray(arts)) return null
  return arts.find((a: any) => a?.type === 'handoff') || null
})

const liveStatus = computed(() => {
  const arts = item.value.artifacts
  if (!Array.isArray(arts)) return null
  return arts.find((a: any) => a?.type === 'liveStatus') || null
})

const activityText = computed(() => liveStatus.value?.activity || null)
const modelName = computed(() => {
  const m = liveStatus.value?.model || handoff.value?.provider || null
  if (!m) return null
  // Shorten common model names
  return m.replace('claude-', '').replace('-20250', '')
})

const elapsedText = computed(() => {
  const dispatched = handoff.value?.dispatchedAt
  if (!dispatched || !isActive.value) return null
  const ms = Date.now() - new Date(dispatched).getTime()
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ${secs % 60}s`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
})

// Tick elapsed time every second when active
const now = ref(Date.now())
let elapsedTimer: ReturnType<typeof setInterval> | null = null
watch(isActive, (active) => {
  if (active && !elapsedTimer) {
    elapsedTimer = setInterval(() => { now.value = Date.now() }, 1000)
  } else if (!active && elapsedTimer) {
    clearInterval(elapsedTimer)
    elapsedTimer = null
  }
}, { immediate: true })
onUnmounted(() => { if (elapsedTimer) clearInterval(elapsedTimer) })

// Touch device detection
const isTouchDevice = ref(false)
if (import.meta.client) {
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

function handleDetail(event: Event) {
  event.stopPropagation()
  if (item.value.id) projectActions?.openDetail(item.value.id)
}

function handleAddChild(event: Event) {
  event.stopPropagation()
  if (item.value.id) projectActions?.addChild(item.value.id)
}

function handleDispatch(event: Event) {
  event.stopPropagation()
  if (item.value.id) projectActions?.dispatch(item.value.id)
}
</script>

<template>
  <div
    class="work-item group"
    :class="[
      `work-item--type-${item.type}`,
      { 'work-item--selected': selected, 'work-item--dragging': dragging, 'work-item--done': isDone },
      statusConfig.class,
    ]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <Handle type="target" :position="Position.Top" class="work-handle" />

    <!-- Header: status + assignee -->
    <div class="flex items-center gap-1 mb-1 opacity-70">
      <UIcon :name="typeConfig.icon" class="size-3" />
      <UIcon
        :name="statusConfig.icon"
        class="size-3"
        :class="{ 'animate-spin': item.status === 'active' }"
      />
      <span class="ml-auto">
        <UIcon :name="assigneeConfig.icon" class="size-3" />
      </span>
    </div>

    <!-- Pipeline LEDs — always visible -->
    <div class="led-strip">
      <div
        v-for="dot in pipelineDots"
        :key="dot.stage"
        class="led"
        :class="`led--${dot.state}`"
        :title="`${dot.stage}: ${dot.state}`"
      />
    </div>

    <!-- Title -->
    <p class="text-xs font-medium leading-snug">
      {{ displayTitle }}
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
      v-if="isActive"
      class="mt-1.5 h-0.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden"
    >
      <div class="h-full bg-primary-500 rounded-full animate-progress" />
    </div>

    <!-- Dispatch button — always visible, disabled when active/done -->
    <button
      class="work-item__dispatch"
      :class="{ 'work-item__dispatch--disabled': isActive || isDone }"
      :disabled="isActive || isDone"
      title="Dispatch work"
      @click.stop="handleDispatch"
    >
      <UIcon name="i-lucide-send" class="size-3" />
    </button>

    <!-- Secondary actions (hover) -->
    <div class="work-item__actions" :class="{ 'opacity-0 group-hover:opacity-100': !isTouchDevice }">
      <button
        class="work-item__action"
        title="Add child"
        @click.stop="handleAddChild"
      >
        <UIcon name="i-lucide-plus" class="size-3.5" />
      </button>
      <button
        class="work-item__action"
        title="Open detail"
        @click.stop="handleDetail"
      >
        <UIcon name="i-lucide-panel-right-open" class="size-3.5" />
      </button>
    </div>

    <Handle type="source" :position="Position.Bottom" class="work-handle" />
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.work-item {
  @apply px-3 py-2.5 rounded-md transition-all duration-150;
  @apply min-w-[160px] max-w-[220px];
  @apply relative;
  @apply border-0 shadow-none;
}

/* Post-it colors per type */
.work-item--type-discover { background: #f3e8ff; color: #581c87; }
.work-item--type-architect { background: #dbeafe; color: #1e3a5f; }
.work-item--type-generate { background: #fef3c7; color: #78350f; }
.work-item--type-compose { background: #cffafe; color: #164e63; }
.work-item--type-review { background: #dcfce7; color: #14532d; }
.work-item--type-deploy { background: #ffe4e6; color: #881337; }

:root.dark .work-item--type-discover { background: #3b0764; color: #e9d5ff; }
:root.dark .work-item--type-architect { background: #1e3a5f; color: #bfdbfe; }
:root.dark .work-item--type-generate { background: #451a03; color: #fde68a; }
:root.dark .work-item--type-compose { background: #164e63; color: #a5f3fc; }
:root.dark .work-item--type-review { background: #14532d; color: #bbf7d0; }
:root.dark .work-item--type-deploy { background: #4c0519; color: #fecdd3; }

.work-item--selected {
  @apply ring-2 ring-offset-1;
  --tw-ring-color: var(--color-primary-500);
}

.work-item--dragging {
  @apply shadow-lg scale-105 cursor-grabbing;
}

.work-item--done {
  @apply opacity-70 scale-95;
}

.work-item--active {
  animation: pulse-work 2s ease-in-out infinite;
  @apply shadow-md scale-105;
}

.work-item--waiting {
  @apply shadow-sm;
  outline: 2px dashed rgba(251, 146, 60, 0.6);
  outline-offset: 2px;
}

.work-item--blocked {
  @apply opacity-40;
  background: #fecaca !important;
  color: #7f1d1d !important;
  text-decoration: line-through;
}

:root.dark .work-item--blocked {
  background: #450a0a !important;
  color: #fca5a5 !important;
}

/* Queued items: slightly muted, waiting to be picked up */
.work-item--queued {
  @apply opacity-70;
}

@keyframes pulse-work {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
  50% { box-shadow: 0 0 8px 2px rgba(99, 102, 241, 0.15); }
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

/* Off — dark recessed, unlit */
.led--pending {
  background: rgba(0,0,0,0.2);
}

/* Current stage, no signal yet — faint warm idle glow */
.led--current {
  background: rgba(255,255,255,0.15);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.3), 0 0 2px rgba(255,255,255,0.1);
}

/* Past stages — same green as signal green */
.led--done {
  background: #10b981;
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 0 4px #10b981, 0 0 8px rgba(16,185,129,0.4);
}

/* Working — green pulse with bloom */
.led--working {
  background: #10b981;
  animation: led-pulse 1.5s ease-in-out infinite;
}

/* Signal: green — solid lit LED with halo */
.led--green {
  background: #10b981;
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 0 4px #10b981, 0 0 8px rgba(16,185,129,0.4);
}

/* Signal: orange — amber lit LED with halo */
.led--orange {
  background: #f59e0b;
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 0 4px #f59e0b, 0 0 8px rgba(245,158,11,0.4);
}

/* Signal: red — red lit LED with halo */
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

.work-handle {
  @apply w-2 h-2 rounded-full;
  @apply bg-neutral-400/50;
  @apply border border-white/50 dark:border-neutral-800/50;
  @apply transition-colors;
}

.work-handle:hover {
  background-color: var(--color-primary-500);
}

.work-item__dispatch {
  @apply absolute -bottom-2 -right-2 z-10;
  @apply w-5 h-5 rounded-full flex items-center justify-center;
  @apply bg-white/90 dark:bg-neutral-700/90 backdrop-blur-sm;
  @apply shadow-sm cursor-pointer transition-all duration-150;
  @apply text-neutral-400 hover:scale-110;
  &:hover { color: var(--color-primary-500); }
}

.work-item__dispatch--disabled {
  @apply opacity-30 cursor-not-allowed;
  &:hover { transform: none; color: inherit; }
}

.work-item__actions {
  @apply absolute -top-2 -right-2 flex gap-1 z-10;
}

.work-item__action {
  @apply w-5 h-5 rounded-full flex items-center justify-center;
  @apply bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm;
  @apply shadow-sm cursor-pointer transition-all duration-150;
  @apply text-neutral-500 hover:scale-110;
  &:hover { color: var(--color-primary-500); }
}
</style>
