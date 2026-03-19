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
  queued: { icon: 'i-lucide-circle-dashed', class: '' },
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

const typeConfig = computed(() => TYPE_CONFIG[item.value.type] || TYPE_CONFIG.generate)
const statusConfig = computed(() => STATUS_CONFIG[item.value.status] || STATUS_CONFIG.queued)

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
      { 'work-item--selected': selected, 'work-item--dragging': dragging },
      statusConfig.class,
    ]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <Handle type="target" :position="Position.Top" class="work-handle" />

    <!-- Header: type badge + status + assignee -->
    <div class="flex items-center gap-1.5 mb-1.5">
      <!-- Type badge -->
      <span
        class="text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5"
        :class="typeConfig.badge"
      >
        <UIcon :name="typeConfig.icon" class="size-3" />
        {{ item.type }}
      </span>

      <!-- Status icon -->
      <UIcon
        :name="statusConfig.icon"
        class="size-3.5"
        :class="{
          'text-neutral-400 dark:text-neutral-500': item.status === 'queued',
          'text-primary-500 animate-spin': item.status === 'active',
          'text-amber-500': item.status === 'waiting',
          'text-green-500': item.status === 'done',
          'text-red-500': item.status === 'blocked',
        }"
      />

      <!-- Assignee -->
      <span class="ml-auto inline-flex items-center gap-0.5 text-[10px] text-muted">
        <UIcon :name="assigneeConfig.icon" class="size-3" />
        {{ assigneeConfig.label }}
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
      {{ item.brief }}
    </p>

    <!-- Bottom indicators -->
    <div class="mt-2 flex items-center gap-1.5 flex-wrap">
      <span v-if="hasWorktree" class="inline-flex items-center gap-0.5 text-[10px] text-teal-500">
        <UIcon name="i-lucide-git-branch" class="size-3" />
        {{ item.worktree }}
      </span>

      <span v-if="hasOutput" class="inline-flex items-center gap-0.5 text-[10px] text-green-500">
        <UIcon name="i-lucide-file-check" class="size-3" />
        output
      </span>

      <span v-if="hasDeployUrl" class="inline-flex items-center gap-0.5 text-[10px] text-blue-500">
        <UIcon name="i-lucide-globe" class="size-3" />
        preview
      </span>

      <span v-if="item.skill" class="inline-flex items-center gap-0.5 text-[10px] text-violet-400 ml-auto">
        <UIcon name="i-lucide-terminal" class="size-3" />
        /{{ item.skill }}
      </span>
    </div>

    <!-- Progress bar for active status -->
    <div
      v-if="isActive"
      class="mt-2 h-0.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden"
    >
      <div class="h-full bg-primary-500 rounded-full animate-progress" />
    </div>

    <!-- Node actions (hover on desktop, always visible on touch) -->
    <div class="work-item__actions" :class="{ 'opacity-0 group-hover:opacity-100': !isTouchDevice }">
      <button
        v-if="!isDone"
        class="work-item__action"
        title="Dispatch work"
        @click.stop="handleDispatch"
      >
        <UIcon name="i-lucide-send" class="size-3.5" />
      </button>
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
  @apply px-3 py-2.5 rounded-lg border bg-white dark:bg-neutral-900;
  @apply border-neutral-200 dark:border-neutral-700;
  @apply shadow-sm transition-all duration-150;
  @apply min-w-[180px] max-w-[260px];
  @apply relative;
}

.work-item--selected {
  @apply ring-2;
  border-color: var(--color-primary-500);
  --tw-ring-color: color-mix(in srgb, var(--color-primary-500) 20%, transparent);
}

.work-item--dragging {
  @apply shadow-lg scale-105 cursor-grabbing;
}

.work-item--done {
  @apply border-green-300 dark:border-green-700;
}

.work-item--active {
  animation: pulse-work 1.5s ease-in-out infinite;
  border-color: var(--color-primary-400);
}

.work-item--waiting {
  animation: glow-waiting 2s ease-in-out infinite;
}

.work-item--blocked {
  @apply border-red-300 dark:border-red-700 opacity-90;
}

@keyframes pulse-work {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-primary-500) 30%, transparent); }
  50% { box-shadow: 0 0 12px 2px color-mix(in srgb, var(--color-primary-500) 15%, transparent); }
}

@keyframes glow-waiting {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 146, 60, 0); }
  50% { box-shadow: 0 0 12px 2px rgba(251, 146, 60, 0.2); }
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

.work-item__actions {
  @apply absolute -top-2 -right-2 flex gap-1 z-10;
}

.work-item__action {
  @apply w-6 h-6 rounded-full flex items-center justify-center;
  @apply bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600;
  @apply shadow-sm cursor-pointer transition-all duration-150;
  @apply text-neutral-500 hover:scale-110;
  &:hover { color: var(--color-primary-500); }
}
</style>
