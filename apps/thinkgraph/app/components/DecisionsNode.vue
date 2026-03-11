<script setup lang="ts">
import { computed, ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import type { ThinkgraphDecision } from '../../layers/thinkgraph/collections/decisions/types'

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

const { open } = useCrouton()
const isHovered = ref(false)

const decision = computed(() => props.data as unknown as ThinkgraphDecision)

const isParked = computed(() => decision.value.versionTag === 'parked')
const isStarred = computed(() => decision.value.starred)

const pathTypeConfig: Record<string, { icon: string; color: string }> = {
  diverge: { icon: 'i-lucide-git-branch-plus', color: 'text-green-500' },
  deep_dive: { icon: 'i-lucide-microscope', color: 'text-blue-500' },
  prototype: { icon: 'i-lucide-hammer', color: 'text-orange-500' },
  converge: { icon: 'i-lucide-git-merge', color: 'text-purple-500' },
  validate: { icon: 'i-lucide-shield-question', color: 'text-yellow-500' },
  park: { icon: 'i-lucide-archive', color: 'text-neutral-400' }
}

const nodeTypeConfig: Record<string, { color: string }> = {
  idea: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  insight: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  decision: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  question: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
}

const pathIcon = computed(() => {
  const pt = decision.value.pathType
  return pt ? pathTypeConfig[pt] : null
})

const nodeTypeStyle = computed(() => {
  const nt = decision.value.nodeType
  return nodeTypeConfig[nt] || nodeTypeConfig.insight
})

const displayContent = computed(() => {
  const content = decision.value.content || ''
  return content.length > 80 ? content.slice(0, 77) + '...' : content
})

function handleEdit(event: Event) {
  event.stopPropagation()
  if (props.collection && decision.value.id) {
    open('update', props.collection, [decision.value.id])
  }
}

function toggleStar(event: Event) {
  event.stopPropagation()
  const { teamId } = useTeamContext()
  if (!teamId.value || !decision.value.id) return

  $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/${decision.value.id}`, {
    method: 'PATCH',
    body: { starred: !decision.value.starred }
  })
}
</script>

<template>
  <div
    class="decision-node"
    :class="{
      'decision-node--selected': selected,
      'decision-node--dragging': dragging,
      'decision-node--parked': isParked,
      'decision-node--starred': isStarred
    }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <Handle type="target" :position="Position.Top" class="decision-handle" />

    <!-- Header row: star + path type icon + type badge -->
    <div class="flex items-center gap-1.5 mb-1.5">
      <button
        class="star-btn"
        :class="{ 'star-btn--active': isStarred }"
        @click="toggleStar"
      >
        <UIcon :name="isStarred ? 'i-lucide-star' : 'i-lucide-star'" class="size-3.5" />
      </button>

      <UIcon
        v-if="pathIcon"
        :name="pathIcon.icon"
        :class="pathIcon.color"
        class="size-3.5"
      />

      <span
        class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
        :class="nodeTypeStyle.color"
      >
        {{ decision.nodeType }}
      </span>

      <span
        v-if="decision.branchName && decision.branchName !== 'main'"
        class="ml-auto text-[10px] text-neutral-400 dark:text-neutral-500 truncate max-w-[60px]"
      >
        {{ decision.branchName }}
      </span>
    </div>

    <!-- Content -->
    <p class="text-sm text-neutral-800 dark:text-neutral-200 leading-snug">
      {{ displayContent }}
    </p>

    <!-- Version tag for non-v1 -->
    <div v-if="decision.versionTag && decision.versionTag !== 'v1'" class="mt-1.5">
      <span class="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
        {{ decision.versionTag }}
      </span>
    </div>

    <!-- Hover actions -->
    <div v-if="isHovered" class="decision-node__actions">
      <button
        class="decision-node__action"
        title="Edit"
        @click="handleEdit"
      >
        <UIcon name="i-lucide-pencil" class="size-3.5" />
      </button>
    </div>

    <Handle type="source" :position="Position.Bottom" class="decision-handle" />
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.decision-node {
  @apply px-3 py-2.5 rounded-lg border bg-white dark:bg-neutral-900;
  @apply border-neutral-200 dark:border-neutral-700;
  @apply shadow-sm transition-all duration-150;
  @apply min-w-[160px] max-w-[240px];
  @apply relative;
}

.decision-node--selected {
  @apply ring-2;
  border-color: var(--color-primary-500);
  --tw-ring-color: color-mix(in srgb, var(--color-primary-500) 20%, transparent);
}

.decision-node--dragging {
  @apply shadow-lg scale-105 cursor-grabbing;
}

.decision-node--parked {
  @apply border-dashed opacity-60;
}

.decision-node--starred {
  @apply border-amber-300 dark:border-amber-700;
}

.star-btn {
  @apply text-neutral-300 dark:text-neutral-600 hover:text-amber-400 transition-colors cursor-pointer;
}

.star-btn--active {
  @apply text-amber-400;
}

.decision-node__actions {
  @apply absolute -top-2 -right-2 flex gap-1 z-10;
}

.decision-node__action {
  @apply w-6 h-6 rounded-full flex items-center justify-center;
  @apply bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600;
  @apply shadow-sm cursor-pointer transition-all duration-150;
  @apply text-neutral-500 hover:text-primary-500 hover:scale-110;
}

.decision-handle {
  @apply w-2 h-2 rounded-full;
  @apply bg-neutral-400 dark:bg-neutral-500;
  @apply border border-white dark:border-neutral-800;
  @apply transition-colors;
}

.decision-handle:hover {
  background-color: var(--color-primary-500);
}
</style>
