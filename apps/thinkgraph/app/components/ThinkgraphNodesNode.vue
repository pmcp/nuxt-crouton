<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { ThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/types'
import { STATUS_CONFIG, getNodeTypeConfig, getNodeTypeBadge } from '~/utils/thinkgraph-config'

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
  openCreate: (nodeType: string, parentId?: string) => void
  openDetail: (nodeId: string) => void
  openPathType: (parentId?: string) => void
  setStatus: (nodeId: string, status: string) => Promise<void>
  deleteNode: (nodeId: string) => Promise<void>
  copyContext: (nodeId: string) => Promise<void>
  openContextMenu: (nodeId: string, event: MouseEvent) => void
} | null>('canvasActions', null)
const isHovered = ref(false)

const node = computed(() => props.data as unknown as ThinkgraphNode)

const nodeTypeStyle = computed(() => getNodeTypeConfig(node.value.nodeType))
const nodeTypeBadge = computed(() => getNodeTypeBadge(node.value.nodeType))
const statusConfig = computed(() => STATUS_CONFIG[node.value.status] || STATUS_CONFIG.idle)

const isDraft = computed(() => node.value.status === 'draft')
const isDone = computed(() => node.value.status === 'done')
const isWorking = computed(() => node.value.status === 'working')
const isThinking = computed(() => node.value.status === 'thinking')

const displayTitle = computed(() => {
  const title = node.value.title || ''
  return title.length > 60 ? title.slice(0, 57) + '...' : title
})

const hasOutput = computed(() => !!node.value.output)
const hasBrief = computed(() => !!node.value.brief)
const hasHandoff = computed(() => !!node.value.handoffType)
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
    case 'notion_sync': return 'i-lucide-arrow-down-circle'
    default: return null
  }
})

function handleEdit(event: Event) {
  event.stopPropagation()
  if (node.value.id) {
    canvasActions?.openDetail(node.value.id)
  }
}

function handleAddChild(event: Event) {
  event.stopPropagation()
  if (node.value.id) {
    canvasActions?.openCreate('idea', node.value.id)
  }
}

function handleContextMenu(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  if (node.value.id) {
    canvasActions?.openContextMenu(node.value.id, event)
  }
}
</script>

<template>
  <div
    class="work-node"
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

    <!-- Header: type badge + status + origin -->
    <div class="flex items-center gap-1.5 mb-1.5">
      <!-- Node type badge -->
      <span
        class="text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5"
        :class="nodeTypeBadge"
      >
        <UIcon :name="nodeTypeStyle.icon" class="size-3" />
        {{ node.nodeType?.replace('_', ' ') }}
      </span>

      <!-- Status dot -->
      <span
        v-if="statusConfig.icon"
        class="inline-flex items-center"
      >
        <UIcon
          :name="statusConfig.icon"
          class="size-3.5"
          :class="{
            'text-neutral-400 dark:text-neutral-500': node.status === 'draft',
            'text-blue-400 animate-pulse': node.status === 'thinking',
            'text-primary-500 animate-spin': node.status === 'working',
            'text-orange-500': node.status === 'needs_attention',
            'text-green-500': node.status === 'done',
            'text-red-500': node.status === 'error',
          }"
        />
      </span>

      <!-- Origin badge -->
      <UIcon
        v-if="originIcon"
        :name="originIcon"
        class="size-3 ml-auto"
        :class="{
          'text-violet-400': node.origin === 'ai',
          'text-blue-400': node.origin === 'human',
          'text-neutral-400': node.origin === 'notion_sync',
        }"
      />

      <!-- Step index -->
      <span
        v-if="node.stepIndex != null && !isDraft"
        class="text-[9px] font-mono text-neutral-400 dark:text-neutral-500"
        :class="{ 'ml-auto': !originIcon }"
      >
        #{{ node.stepIndex }}
      </span>
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
      <!-- Worktree indicator -->
      <span
        v-if="hasWorktree"
        class="inline-flex items-center gap-0.5 text-[10px] text-teal-500"
      >
        <UIcon name="i-lucide-git-branch" class="size-3" />
        worktree
      </span>

      <!-- Output available -->
      <span
        v-if="hasOutput"
        class="inline-flex items-center gap-0.5 text-[10px] text-green-500"
      >
        <UIcon name="i-lucide-file-check" class="size-3" />
        output
      </span>

      <!-- Handoff declared -->
      <span
        v-if="hasHandoff"
        class="inline-flex items-center gap-0.5 text-[10px] text-primary-500"
      >
        <UIcon name="i-lucide-arrow-right-circle" class="size-3" />
        {{ node.handoffType?.replace('_', ' ') }}
      </span>

      <!-- Token count -->
      <span
        v-if="node.tokenCount"
        class="inline-flex items-center gap-0.5 text-[10px] text-neutral-400 ml-auto"
      >
        <UIcon name="i-lucide-coins" class="size-3" />
        {{ node.tokenCount.toLocaleString() }}
      </span>
    </div>

    <!-- Progress bar for working status -->
    <div
      v-if="isWorking || isThinking"
      class="mt-2 h-0.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden"
    >
      <div class="h-full bg-primary-500 rounded-full animate-progress" />
    </div>

    <!-- Hover actions -->
    <div v-if="isHovered" class="work-node__actions">
      <button
        class="work-node__action"
        title="Add child"
        @click="handleAddChild"
      >
        <UIcon name="i-lucide-plus" class="size-3.5" />
      </button>
      <button
        class="work-node__action"
        title="Open detail"
        @click="handleEdit"
      >
        <UIcon name="i-lucide-panel-right-open" class="size-3.5" />
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

.work-node--dragging {
  @apply shadow-lg scale-105 cursor-grabbing;
}

.work-node--draft {
  @apply border-dashed opacity-75;
}

.work-node--done {
  @apply border-green-300 dark:border-green-700;
}

/* Status animations (class names from STATUS_CONFIG) */
.work-node--thinking {
  animation: pulse-slow 2s ease-in-out infinite;
}

.work-node--working {
  animation: pulse-work 1.5s ease-in-out infinite;
  border-color: var(--color-primary-400);
}

.work-node--blocked {
  @apply border-neutral-400 dark:border-neutral-500 opacity-80;
}

.work-node--attention {
  animation: glow-attention 2s ease-in-out infinite;
}

.work-node--error {
  animation: pulse-error 1.5s ease-in-out infinite;
  @apply border-red-400 dark:border-red-600;
}

@keyframes pulse-slow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

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

.animate-progress {
  animation: progress 2s ease-in-out infinite;
}

.work-handle {
  @apply w-2 h-2 rounded-full;
  @apply bg-neutral-400 dark:bg-neutral-500;
  @apply border border-white dark:border-neutral-800;
  @apply transition-colors;
}

.work-handle:hover {
  background-color: var(--color-primary-500);
}

.work-node__actions {
  @apply absolute -top-2 -right-2 flex gap-1 z-10;
}

.work-node__action {
  @apply w-6 h-6 rounded-full flex items-center justify-center;
  @apply bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600;
  @apply shadow-sm cursor-pointer transition-all duration-150;
  @apply text-neutral-500 hover:scale-110;
  &:hover { color: var(--color-primary-500); }
}

.work-node__action--delete {
  &:hover { color: var(--color-red-500, #ef4444); border-color: var(--color-red-300, #fca5a5); }
}
</style>
