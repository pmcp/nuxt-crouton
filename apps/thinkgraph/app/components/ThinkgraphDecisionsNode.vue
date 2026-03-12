<script setup lang="ts">
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

const expandFn = inject<(id: string, mode?: string) => void>('thinkgraph:expand', () => {})
const expandingId = inject<Ref<string | null>>('thinkgraph:expanding', ref(null))
const copyContextFn = inject<(id: string, pathType?: string) => Promise<void>>('thinkgraph:copyContext', async () => {})
const openQuickAddFn = inject<(parentId?: string) => void>('thinkgraph:openQuickAdd', () => {})
const openChatFn = inject<(nodeId: string) => void>('thinkgraph:openChat', () => {})
const openDispatchFn = inject<(nodeId: string) => void>('thinkgraph:dispatch', () => {})

const { open } = useCrouton()
const isHovered = ref(false)
const showExpandMenu = ref(false)
const isExpanding = computed(() => expandingId.value === decision.value.id)

const decision = computed(() => props.data as unknown as ThinkgraphDecision)

const isParked = computed(() => decision.value.versionTag === 'parked')
const isStarred = computed(() => decision.value.starred)

const { getBranchColor } = useBranchColors()
const branchColor = computed(() => getBranchColor(decision.value.branchName))

const expandModes = [
  { id: 'default', label: 'Quick expand', icon: 'i-lucide-sparkles', description: '3 diverse perspectives' },
  { id: 'diverge', label: 'Diverge', icon: 'i-lucide-git-branch-plus', description: '5 alternative approaches' },
  { id: 'deep_dive', label: 'Deep dive', icon: 'i-lucide-microscope', description: 'Implications & edge cases' },
  { id: 'prototype', label: 'Prototype', icon: 'i-lucide-hammer', description: 'Practical, actionable steps' },
  { id: 'converge', label: 'Converge', icon: 'i-lucide-git-merge', description: 'Synthesize into strategy' },
  { id: 'validate', label: 'Challenge', icon: 'i-lucide-shield-question', description: 'Find holes & risks' },
]

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
  // Strip markdown syntax for cleaner node preview
  const plain = content
    .replace(/^#{1,6}\s+/gm, '')     // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1')     // italic
    .replace(/^[-*]\s+/gm, '• ')      // bullet lists
    .replace(/^\d+\.\s+/gm, '')       // numbered lists
    .replace(/`([^`]+)`/g, '$1')       // inline code
    .replace(/\n{2,}/g, ' — ')        // paragraph breaks → dash
    .replace(/\n/g, ' ')              // line breaks → space
    .trim()
  return plain.length > 80 ? plain.slice(0, 77) + '...' : plain
})

const imageArtifact = computed(() =>
  decision.value.artifacts?.find((a: any) => a.type === 'image' && a.url)
)

const prototypeArtifact = computed(() =>
  decision.value.artifacts?.find((a: any) => a.type === 'prototype' && a.content)
)

const codeArtifact = computed(() =>
  decision.value.artifacts?.find((a: any) => a.type === 'code' && a.content)
)

const nonVisualArtifacts = computed(() =>
  decision.value.artifacts?.filter((a: any) =>
    a.type !== 'image'
    && a.type !== 'code'
    && !(a.type === 'prototype' && a.url)
  ) || []
)

function openPrototype(event: Event) {
  event.stopPropagation()
  if (!prototypeArtifact.value?.content) return
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(prototypeArtifact.value.content)
    win.document.close()
  }
}

const codeCopied = ref(false)
async function copyCode(event: Event) {
  event.stopPropagation()
  if (!codeArtifact.value?.content) return
  await navigator.clipboard.writeText(codeArtifact.value.content)
  codeCopied.value = true
  setTimeout(() => { codeCopied.value = false }, 2000)
}

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
    expandFn(decision.value.id, mode)
  }
}

function handleChat(event: Event) {
  event.stopPropagation()
  if (decision.value.id) {
    openChatFn(decision.value.id)
  }
}

function handleCopyContext(event: Event) {
  event.stopPropagation()
  if (decision.value.id) {
    copyContextFn(decision.value.id)
  }
}

function handleDispatch(event: Event) {
  event.stopPropagation()
  if (decision.value.id) {
    openDispatchFn(decision.value.id)
  }
}

function handlePasteChildren(event: Event) {
  event.stopPropagation()
  if (decision.value.id) {
    openQuickAddFn(decision.value.id)
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
    :class="[
      {
        'decision-node--selected': selected,
        'decision-node--dragging': dragging,
        'decision-node--parked': isParked,
        'decision-node--starred': isStarred,
      },
      branchColor.bg,
      branchColor.border ? `border-l-3 ${branchColor.border}` : '',
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

    <!-- Image artifact preview -->
    <div v-if="imageArtifact" class="mt-1.5 -mx-1">
      <img
        :src="imageArtifact.url"
        :alt="imageArtifact.prompt || 'Generated image'"
        class="w-full rounded border border-neutral-200 dark:border-neutral-700"
      />
    </div>

    <!-- Prototype artifact preview (iframe) -->
    <div v-if="prototypeArtifact" class="mt-1.5 -mx-1">
      <div class="rounded border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <iframe
          :srcdoc="prototypeArtifact.content"
          class="w-full h-[120px] bg-white pointer-events-none"
          sandbox="allow-scripts"
        />
        <button
          class="flex items-center justify-center gap-1 w-full px-2 py-1.5 bg-neutral-100 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          @click="openPrototype"
        >
          <UIcon name="i-lucide-external-link" class="size-3 text-primary-500" />
          <span class="text-[10px] text-primary-600 dark:text-primary-400">Open full size</span>
        </button>
      </div>
    </div>

    <!-- Code artifact preview -->
    <div v-if="codeArtifact" class="mt-1.5 -mx-1">
      <div class="rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 overflow-hidden">
        <div class="flex items-center justify-between px-2 py-1 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
          <span class="text-[10px] font-mono text-neutral-500">{{ codeArtifact.metadata?.language || 'code' }}</span>
          <button
            class="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
            @click="copyCode"
          >
            <UIcon :name="codeCopied ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3" />
          </button>
        </div>
        <pre class="px-2 py-1.5 text-[10px] font-mono leading-tight text-neutral-700 dark:text-neutral-300 max-h-[80px] overflow-hidden">{{ codeArtifact.content.slice(0, 200) }}{{ codeArtifact.content.length > 200 ? '...' : '' }}</pre>
      </div>
    </div>

    <!-- Non-visual artifact indicators -->
    <div v-if="nonVisualArtifacts.length" class="mt-1.5 flex items-center gap-1.5 flex-wrap">
      <span
        v-for="(artifact, i) in nonVisualArtifacts"
        :key="i"
        class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
      >
        <UIcon
          :name="artifact.type === 'code' ? 'i-lucide-code' : artifact.type === 'prototype' ? 'i-lucide-layout-template' : 'i-lucide-text'"
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
            v-for="mode in expandModes"
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
</style>
