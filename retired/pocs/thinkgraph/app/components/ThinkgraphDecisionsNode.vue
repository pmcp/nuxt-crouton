<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { ThinkgraphNode } from '../../layers/thinkgraph/collections/nodes/types'

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

const ctx = useThinkgraphContext()

const { open } = useCrouton()
const isHovered = ref(false)
const showExpandMenu = ref(false)

const decision = computed(() => props.data as unknown as ThinkgraphNode)
const isExpanding = computed(() => ctx.expanding.value === decision.value.id)

const isParked = computed(() => decision.value.versionTag === 'parked')
const isStarred = computed(() => decision.value.starred)
const isPinned = computed(() => decision.value.pinned)

const { getBranchColor } = useBranchColors()
const branchColor = computed(() => getBranchColor(decision.value.branchName))

import { EXPAND_MODES, PATH_TYPE_CONFIG, STATUS_CONFIG, getNodeTypeConfig, getNodeTypeBadge } from '~/utils/thinkgraph-config'

const pathIcon = computed(() => {
  const pt = decision.value.pathType
  return pt ? PATH_TYPE_CONFIG[pt] : null
})

const nodeTypeStyle = computed(() => {
  return { color: getNodeTypeBadge(decision.value.nodeType), icon: getNodeTypeConfig(decision.value.nodeType).icon }
})

const nodeStatus = computed(() => {
  const s = decision.value.status || 'idle'
  return STATUS_CONFIG[s] || STATUS_CONFIG.idle
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

function handleDelete(event: Event) {
  event.stopPropagation()
  if (props.collection && decision.value.id) {
    open('delete', props.collection, [decision.value.id])
  }
}

function handleAddChild(event: Event) {
  event.stopPropagation()
  if (props.collection && decision.value.id) {
    open('create', props.collection, [], undefined, { parentId: decision.value.id })
  }
}

function handleExpandClick(event: Event) {
  event.stopPropagation()
  if (isExpanding.value) return
  showExpandMenu.value = !showExpandMenu.value
}

function handleExpandMode(mode: string, event: Event) {
  event.stopPropagation()
  showExpandMenu.value = false
  if (decision.value.id) {
    ctx.expand(decision.value.id, mode)
  }
}

function handleChat(event: Event) {
  event.stopPropagation()
  if (decision.value.id) {
    ctx.openChat(decision.value.id)
  }
}

function handleCopyContext(event: Event) {
  event.stopPropagation()
  if (decision.value.id) {
    ctx.copyContext(decision.value.id)
  }
}

function handleDispatch(event: Event) {
  event.stopPropagation()
  if (decision.value.id) {
    ctx.openDispatch(decision.value.id)
  }
}

function handlePasteChildren(event: Event) {
  event.stopPropagation()
  if (decision.value.id) {
    ctx.openQuickAdd(decision.value.id)
  }
}

function toggleStar(event: Event) {
  event.stopPropagation()
  if (decision.value.id) {
    ctx.toggleStar(decision.value.id)
  }
}

function togglePin(event: Event) {
  event.stopPropagation()
  if (decision.value.id) {
    ctx.togglePin(decision.value.id)
  }
}
</script>

<template>
  <div
    class="decision-node"
    :class="[
      {
        'decision-node--selected': selected,
        'decision-node--dragging': dragging,
        'decision-node--parked': isParked,
        'decision-node--starred': isStarred,
        'decision-node--pinned': isPinned,
      },
      branchColor.bg,
      branchColor.border ? `border-l-3 ${branchColor.border}` : '',
      nodeStatus.class,
    ]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false; showExpandMenu = false"
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

      <button
        class="pin-btn"
        :class="{ 'pin-btn--active': isPinned }"
        @click="togglePin"
      >
        <UIcon :name="isPinned ? 'i-lucide-pin' : 'i-lucide-pin-off'" class="size-3.5" />
      </button>

      <UIcon
        v-if="pathIcon"
        :name="pathIcon.icon"
        :class="pathIcon.color"
        class="size-3.5"
      />

      <span
        class="text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5"
        :class="nodeTypeStyle.color"
      >
        <UIcon
          v-if="nodeTypeStyle.icon"
          :name="nodeTypeStyle.icon"
          class="size-3"
        />
        {{ decision.template }}
      </span>

      <!-- Status indicator -->
      <UIcon
        v-if="nodeStatus.icon"
        :name="nodeStatus.icon"
        class="size-3.5"
        :class="{
          'text-neutral-400 dark:text-neutral-500': decision.status === 'draft',
          'text-blue-400 animate-pulse': decision.status === 'thinking',
          'text-primary-500 animate-spin': decision.status === 'working',
          'text-neutral-400': decision.status === 'blocked',
          'text-orange-500': decision.status === 'needs_attention',
          'text-green-500': decision.status === 'done',
          'text-red-500': decision.status === 'error',
        }"
      />

      <span
        v-if="decision.branchName && decision.branchName !== 'main'"
        class="ml-auto flex items-center gap-1 text-[10px] truncate max-w-[80px]"
        :class="branchColor.text"
      >
        <span class="size-1.5 rounded-full shrink-0" :class="branchColor.dot" />
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

    <!-- AI source indicator -->
    <div v-if="decision.source === 'ai' || decision.source === 'dispatch'" class="mt-1.5 flex items-center gap-1">
      <UIcon :name="decision.source === 'dispatch' ? 'i-lucide-send' : 'i-lucide-sparkles'" class="size-3 text-violet-400" />
      <span class="text-[10px] text-violet-400">{{ decision.source === 'dispatch' ? decision.model : 'AI generated' }}</span>
    </div>

    <!-- Notion sync indicator -->
    <div v-if="decision.notionId" class="mt-1.5 flex items-center gap-1">
      <UIcon name="i-lucide-link" class="size-3 text-neutral-400" />
      <span class="text-[10px] text-neutral-400">Notion synced</span>
    </div>

    <!-- Claude Code terminal indicator -->
    <button
      v-if="decision.status === 'thinking' || decision.status === 'working'"
      class="mt-2 w-full flex items-center gap-1.5 px-2 py-1.5 rounded bg-neutral-900 dark:bg-neutral-950 text-left cursor-pointer hover:bg-neutral-800 dark:hover:bg-neutral-900 transition-colors"
      @click.stop="ctx.openTerminal(decision.id)"
    >
      <UIcon name="i-lucide-terminal" class="size-3 text-green-400 shrink-0" />
      <span class="text-[10px] text-green-400 font-mono truncate">
        {{ decision.status === 'thinking' ? 'Claude is thinking...' : 'Claude is working...' }}
      </span>
      <UIcon name="i-lucide-maximize-2" class="size-3 text-neutral-500 ml-auto shrink-0" />
    </button>

    <!-- Brief available indicator -->
    <div v-if="decision.brief" class="mt-1.5 flex items-center gap-1">
      <UIcon name="i-lucide-file-text" class="size-3 text-teal-400" />
      <span class="text-[10px] text-teal-400">Brief available</span>
    </div>

    <!-- Artifact indicators -->
    <div v-if="decision.artifacts?.length" class="mt-1.5 flex items-center gap-1.5 flex-wrap">
      <span
        v-for="(artifact, i) in decision.artifacts"
        :key="i"
        class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
      >
        <UIcon
          :name="artifact.type === 'image' ? 'i-lucide-image' : artifact.type === 'code' ? 'i-lucide-code' : artifact.type === 'prototype' ? 'i-lucide-layout-template' : 'i-lucide-text'"
          class="size-3"
        />
        {{ artifact.type }}
      </span>
    </div>

    <!-- Hover actions -->
    <div v-if="isHovered" class="decision-node__actions">
      <!-- AI expand with mode picker -->
      <div class="relative">
        <button
          class="decision-node__action decision-node__action--ai"
          :class="{ 'decision-node__action--loading': isExpanding }"
          title="Expand with AI"
          :disabled="isExpanding"
          @click="handleExpandClick"
        >
          <UIcon :name="isExpanding ? 'i-lucide-loader-2' : 'i-lucide-sparkles'" class="size-3.5" :class="{ 'animate-spin': isExpanding }" />
        </button>

        <!-- Expand mode dropdown -->
        <div
          v-if="showExpandMenu"
          class="expand-menu"
        >
          <button
            v-for="mode in EXPAND_MODES"
            :key="mode.id"
            class="expand-menu__item"
            @click="handleExpandMode(mode.id, $event)"
          >
            <UIcon :name="mode.icon" class="size-3.5 shrink-0" />
            <div class="min-w-0">
              <div class="text-xs font-medium">{{ mode.label }}</div>
              <div class="text-[10px] opacity-60">{{ mode.description }}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Chat -->
      <button
        class="decision-node__action decision-node__action--chat"
        title="Chat about this"
        @click="handleChat"
      >
        <UIcon name="i-lucide-message-square-text" class="size-3.5" />
      </button>

      <!-- Dispatch / Send to... -->
      <button
        class="decision-node__action decision-node__action--dispatch"
        title="Send to..."
        @click="handleDispatch"
      >
        <UIcon name="i-lucide-send" class="size-3.5" />
      </button>

      <!-- Pi Agent session -->
      <button
        class="decision-node__action"
        title="Open Pi session"
        @click.stop="ctx.openSession(decision.id)"
      >
        <UIcon name="i-lucide-bot" class="size-3.5" />
      </button>

      <!-- Copy context -->
      <button
        class="decision-node__action"
        title="Copy context"
        @click="handleCopyContext"
      >
        <UIcon name="i-lucide-copy" class="size-3.5" />
      </button>

      <!-- Paste children -->
      <button
        class="decision-node__action"
        title="Paste children"
        @click="handlePasteChildren"
      >
        <UIcon name="i-lucide-clipboard-paste" class="size-3.5" />
      </button>

      <!-- Add child -->
      <button
        class="decision-node__action"
        title="Add child"
        @click="handleAddChild"
      >
        <UIcon name="i-lucide-plus" class="size-3.5" />
      </button>

      <!-- Edit -->
      <button
        class="decision-node__action"
        title="Edit"
        @click="handleEdit"
      >
        <UIcon name="i-lucide-pencil" class="size-3.5" />
      </button>

      <!-- Delete -->
      <button
        class="decision-node__action decision-node__action--delete"
        title="Delete"
        @click="handleDelete"
      >
        <UIcon name="i-lucide-trash-2" class="size-3.5" />
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

.decision-node--pinned {
  @apply border-blue-300 dark:border-blue-700;
}

.star-btn {
  @apply text-neutral-300 dark:text-neutral-600 hover:text-amber-400 transition-colors cursor-pointer;
}

.star-btn--active {
  @apply text-amber-400;
}

.pin-btn {
  @apply text-neutral-300 dark:text-neutral-600 hover:text-blue-400 transition-colors cursor-pointer;
}

.pin-btn--active {
  @apply text-blue-400;
}

.decision-node__actions {
  @apply absolute -top-2 -right-2 flex gap-1 z-10;
}

.decision-node__action {
  @apply w-6 h-6 rounded-full flex items-center justify-center;
  @apply bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600;
  @apply shadow-sm cursor-pointer transition-all duration-150;
  @apply text-neutral-500 hover:scale-110;
  &:hover { color: var(--color-primary-500); }
}

.decision-node__action--ai {
  &:hover { color: var(--color-violet-500, #8b5cf6); border-color: var(--color-violet-300, #c4b5fd); }
}

.decision-node__action--chat {
  &:hover { color: var(--color-blue-500, #3b82f6); border-color: var(--color-blue-300, #93c5fd); }
}

.decision-node__action--dispatch {
  &:hover { color: var(--color-teal-500, #14b8a6); border-color: var(--color-teal-300, #5eead4); }
}

.decision-node__action--delete {
  &:hover { color: var(--color-red-500, #ef4444); border-color: var(--color-red-300, #fca5a5); }
}

.decision-node__action--loading {
  @apply opacity-60;
}

.expand-menu {
  @apply absolute top-8 right-0 w-52 py-1;
  @apply bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700;
  @apply rounded-lg shadow-lg z-50;
}

.expand-menu__item {
  @apply flex items-center gap-2 w-full px-3 py-1.5 text-left;
  @apply hover:bg-neutral-50 dark:hover:bg-neutral-700/50;
  @apply transition-colors cursor-pointer;
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

.decision-node--draft {
  @apply border-dashed opacity-75;
}

.decision-node--thinking {
  animation: pulse-slow 2s ease-in-out infinite;
}

.decision-node--working {
  animation: pulse-work 1.5s ease-in-out infinite;
  border-color: var(--color-primary-400);
}

.decision-node--blocked {
  @apply opacity-50;
}

.decision-node--attention {
  animation: glow-attention 2s ease-in-out infinite;
}

.decision-node--done {
  @apply border-green-300 dark:border-green-700;
}

.decision-node--error {
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
</style>
