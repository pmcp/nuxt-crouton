<script setup lang="ts">
import type { ThinkgraphNode, SuggestedNode, SuggestedNodesArtifact } from '../../layers/thinkgraph/collections/nodes/types'

interface Props {
  nodeId: string | null
  decisions: ThinkgraphNode[]
  graphId: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'select-node': [nodeId: string]
  'open-chat': [nodeId: string]
  'expand': [nodeId: string, mode?: string]
  'dispatch': [nodeId: string]
  'edit': [nodeId: string]
  'add-child': [nodeId: string]
  'toggle-star': [nodeId: string]
  'delete-node': [nodeId: string]
  'create-node': [data: { content: string; nodeType: string; parentId: string }]
}>()

const decisionsRef = computed(() => props.decisions)
const { copyContext } = useContextGenerator(decisionsRef)
const { getNodeById, getAncestorChain, getChildren, getStarredOutsidePath } = useDecisionGraph(decisionsRef)

const ancestorChain = computed(() => {
  if (!props.nodeId) return []
  return getAncestorChain(props.nodeId)
})

const children = computed(() => {
  if (!props.nodeId) return []
  return getChildren(props.nodeId)
})

const selectedNode = computed(() => {
  if (!props.nodeId) return null
  return getNodeById(props.nodeId) || null
})

const starredInsights = computed(() => {
  if (!props.nodeId) return []
  return getStarredOutsidePath(props.nodeId)
})

import { getNodeTypeConfig } from '~/utils/thinkgraph-config'

// Hover actions per node
const hoveredNodeId = ref<string | null>(null)

const contextCopied = ref<string | null>(null)
async function handleCopyContext(nodeId: string) {
  await copyContext(nodeId)
  contextCopied.value = nodeId
  setTimeout(() => { contextCopied.value = null }, 2000)
}

// Auto-scroll to selected node when it changes
const scrollContainer = ref<HTMLElement | null>(null)

watch(() => props.nodeId, (id) => {
  if (!id) return
  nextTick(() => {
    const el = scrollContainer.value?.querySelector(`[data-node-id="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
})

// Quick add input
const quickAddContent = ref('')
const quickAddType = ref<'idea' | 'insight' | 'decision' | 'question'>('idea')

function handleQuickAdd() {
  if (!quickAddContent.value.trim() || !props.nodeId) return
  emit('create-node', {
    content: quickAddContent.value.trim(),
    nodeType: quickAddType.value,
    parentId: props.nodeId,
  })
  quickAddContent.value = ''
}

const quickAddTypes = [
  { value: 'idea', icon: 'i-lucide-lightbulb', color: 'text-emerald-500' },
  { value: 'insight', icon: 'i-lucide-eye', color: 'text-blue-500' },
  { value: 'decision', icon: 'i-lucide-check-circle', color: 'text-purple-500' },
  { value: 'question', icon: 'i-lucide-help-circle', color: 'text-amber-500' },
] as const

// ─── Output display + text selection ───
const showOutput = ref(true)
const outputRef = ref<HTMLElement | null>(null)
const { selectedText, selectionRect, hasSelection, clearSelection } = useTextSelection(outputRef)

function createFromSelection() {
  if (!selectedText.value || !props.nodeId) return
  emit('create-node', {
    content: selectedText.value,
    nodeType: 'idea',
    parentId: props.nodeId,
  })
  clearSelection()
}

// ─── Suggested nodes from artifacts ───
const suggestedNodes = computed<SuggestedNode[]>(() => {
  const node = selectedNode.value
  if (!node?.artifacts) return []
  const artifacts = Array.isArray(node.artifacts) ? node.artifacts : []
  const artifact = artifacts.find((a): a is SuggestedNodesArtifact => a?.type === 'suggested-nodes')
  return artifact?.nodes || []
})

function createFromSuggestion(suggestion: SuggestedNode) {
  if (!props.nodeId) return
  emit('create-node', {
    content: suggestion.title,
    nodeType: suggestion.nodeType || 'idea',
    parentId: props.nodeId,
  })
}
</script>

<template>
  <div class="w-[360px] border-l border-default flex flex-col h-full bg-default flex-shrink-0">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-default shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <UIcon name="i-lucide-route" class="size-4 text-primary shrink-0" />
        <span class="text-sm font-semibold truncate">Thinking Path</span>
      </div>
      <UButton
        icon="i-lucide-x"
        size="xs"
        variant="ghost"
        color="neutral"
        @click="emit('close')"
      />
    </div>

    <!-- Empty state -->
    <div v-if="!nodeId" class="flex-1 flex items-center justify-center p-6 text-center">
      <div>
        <UIcon name="i-lucide-mouse-pointer-click" class="size-8 text-muted mx-auto mb-3" />
        <p class="text-sm text-muted">Click a node to see its thinking path</p>
      </div>
    </div>

    <!-- Path content -->
    <div v-else ref="scrollContainer" class="flex-1 overflow-y-auto">
      <!-- Ancestor chain -->
      <div class="px-3 pt-3 pb-1">
        <p class="text-[10px] font-semibold text-muted uppercase tracking-wider px-1 mb-2">Path</p>

        <div class="space-y-0">
          <div
            v-for="(node, index) in ancestorChain"
            :key="node.id"
            :data-node-id="node.id"
            class="relative"
            @mouseenter="hoveredNodeId = node.id"
            @mouseleave="hoveredNodeId = null"
          >
            <!-- Connector line -->
            <div
              v-if="index > 0"
              class="absolute left-[15px] -top-1 w-px h-2 bg-stone-200 dark:bg-stone-600"
            />

            <div
              class="w-full text-left px-2 py-2 rounded-lg transition-all cursor-pointer"
              :class="[
                node.id === nodeId
                  ? 'bg-primary-50 dark:bg-primary-950/30 ring-1 ring-primary-200 dark:ring-primary-800'
                  : 'hover:bg-muted/50'
              ]"
              @click="emit('select-node', node.id)"
            >
              <div class="flex items-start gap-2.5">
                <!-- Node type icon -->
                <div
                  class="mt-0.5 size-[22px] rounded-md flex items-center justify-center shrink-0"
                  :class="getNodeTypeConfig(node.nodeType).bg"
                >
                  <UIcon
                    :name="getNodeTypeConfig(node.nodeType).icon"
                    class="size-3.5"
                    :class="getNodeTypeConfig(node.nodeType).color"
                  />
                </div>

                <div class="min-w-0 flex-1">
                  <!-- Type + badges -->
                  <div class="flex items-center gap-1.5 mb-0.5">
                    <span class="text-[10px] font-medium" :class="getNodeTypeConfig(node.nodeType).color">
                      {{ node.nodeType }}
                    </span>
                    <UIcon
                      v-if="node.starred"
                      name="i-lucide-star"
                      class="size-3 text-amber-400"
                    />
                    <UIcon
                      v-if="node.source === 'mcp' || node.source === 'ai' || node.source === 'dispatch'"
                      name="i-lucide-sparkles"
                      class="size-3 text-violet-400"
                    />
                  </div>

                  <!-- Full content -->
                  <p
                    class="text-sm leading-snug whitespace-pre-wrap"
                    :class="node.id === nodeId ? 'text-highlighted font-medium' : 'text-default'"
                  >
                    {{ node.content }}
                  </p>

                  <!-- Hover actions -->
                  <div
                    v-if="hoveredNodeId === node.id"
                    class="flex items-center gap-1 mt-1.5 -ml-0.5"
                  >
                    <button
                      class="p-1 rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                      title="Expand with AI"
                      @click.stop="emit('expand', node.id)"
                    >
                      <UIcon name="i-lucide-sparkles" class="size-3.5 text-violet-500" />
                    </button>
                    <button
                      class="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      title="Chat"
                      @click.stop="emit('open-chat', node.id)"
                    >
                      <UIcon name="i-lucide-message-square-text" class="size-3.5 text-blue-500" />
                    </button>
                    <button
                      class="p-1 rounded hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors"
                      title="Send to..."
                      @click.stop="emit('dispatch', node.id)"
                    >
                      <UIcon name="i-lucide-send" class="size-3.5 text-teal-500" />
                    </button>
                    <button
                      class="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      title="Add child"
                      @click.stop="emit('add-child', node.id)"
                    >
                      <UIcon name="i-lucide-plus" class="size-3.5 text-stone-500" />
                    </button>
                    <button
                      class="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                      :title="node.starred ? 'Unstar' : 'Star'"
                      @click.stop="emit('toggle-star', node.id)"
                    >
                      <UIcon name="i-lucide-star" class="size-3.5" :class="node.starred ? 'text-amber-400' : 'text-stone-400'" />
                    </button>
                    <button
                      class="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      title="Edit"
                      @click.stop="emit('edit', node.id)"
                    >
                      <UIcon name="i-lucide-pencil" class="size-3.5 text-stone-500" />
                    </button>
                    <button
                      class="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      :title="contextCopied === node.id ? 'Copied!' : 'Copy context'"
                      @click.stop="handleCopyContext(node.id)"
                    >
                      <UIcon :name="contextCopied === node.id ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5 text-stone-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Connector line after (except last) -->
            <div
              v-if="index < ancestorChain.length - 1"
              class="absolute left-[15px] -bottom-1 w-px h-2 bg-stone-200 dark:bg-stone-600"
            />
          </div>
        </div>
      </div>

      <!-- Output -->
      <div v-if="selectedNode?.output" class="px-3 pt-2 pb-1">
        <button
          class="flex items-center gap-1 w-full text-left px-1 mb-2"
          @click="showOutput = !showOutput"
        >
          <UIcon
            :name="showOutput ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="size-3 text-muted"
          />
          <p class="text-[10px] font-semibold text-muted uppercase tracking-wider">Output</p>
        </button>

        <div v-if="showOutput" ref="outputRef" class="relative px-1">
          <div class="text-sm prose prose-sm dark:prose-invert max-w-none">
            <MDC :value="selectedNode.output" tag="div" />
          </div>

          <!-- Floating "New node" button on text selection -->
          <div
            v-if="hasSelection && selectionRect"
            class="absolute z-10"
            :style="{ top: `${selectionRect.top}px`, left: `${selectionRect.left}px` }"
          >
            <button
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-medium shadow-lg hover:bg-primary-600 transition-colors"
              @mousedown.prevent="createFromSelection"
            >
              <UIcon name="i-lucide-plus" class="size-3.5" />
              New node
            </button>
          </div>
        </div>
      </div>

      <!-- Suggested Nodes -->
      <div v-if="suggestedNodes.length" class="px-3 pt-2 pb-1">
        <p class="text-[10px] font-semibold text-muted uppercase tracking-wider px-1 mb-2">
          Suggested Nodes
        </p>
        <div class="space-y-1.5">
          <button
            v-for="(suggestion, i) in suggestedNodes"
            :key="i"
            class="w-full text-left px-2.5 py-2 rounded-lg border border-dashed border-default hover:border-primary/50 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 transition-all group cursor-pointer"
            @click="createFromSuggestion(suggestion)"
          >
            <div class="flex items-start gap-2">
              <UIcon name="i-lucide-plus-circle" class="size-4 mt-0.5 shrink-0 text-muted group-hover:text-primary transition-colors" />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 mb-0.5">
                  <span class="text-[10px] font-medium text-muted">{{ suggestion.nodeType }}</span>
                </div>
                <p class="text-xs text-default leading-snug">{{ suggestion.title }}</p>
                <p v-if="suggestion.brief" class="text-[11px] text-muted mt-0.5 line-clamp-2">{{ suggestion.brief }}</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Children -->
      <div v-if="children.length" class="px-3 pt-2 pb-1">
        <p class="text-[10px] font-semibold text-muted uppercase tracking-wider px-1 mb-2">
          Children ({{ children.length }})
        </p>

        <div class="space-y-1">
          <div
            v-for="child in children"
            :key="child.id"
            class="group relative"
            @mouseenter="hoveredNodeId = child.id"
            @mouseleave="hoveredNodeId = null"
          >
            <div
              class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-all cursor-pointer"
              @click="emit('select-node', child.id)"
            >
              <div class="flex items-start gap-2">
                <UIcon
                  :name="getNodeTypeConfig(child.nodeType).icon"
                  class="size-3.5 mt-0.5 shrink-0"
                  :class="getNodeTypeConfig(child.nodeType).color"
                />
                <div class="min-w-0 flex-1">
                  <p class="text-xs text-default leading-snug whitespace-pre-wrap">
                    {{ child.content }}
                  </p>

                  <!-- Hover actions for children -->
                  <div
                    v-if="hoveredNodeId === child.id"
                    class="flex items-center gap-1 mt-1 -ml-0.5"
                  >
                    <button
                      class="p-0.5 rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                      title="Expand"
                      @click.stop="emit('expand', child.id)"
                    >
                      <UIcon name="i-lucide-sparkles" class="size-3 text-violet-500" />
                    </button>
                    <button
                      class="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      title="Chat"
                      @click.stop="emit('open-chat', child.id)"
                    >
                      <UIcon name="i-lucide-message-square-text" class="size-3 text-blue-500" />
                    </button>
                    <button
                      class="p-0.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      title="Edit"
                      @click.stop="emit('edit', child.id)"
                    >
                      <UIcon name="i-lucide-pencil" class="size-3 text-stone-500" />
                    </button>
                    <button
                      class="p-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                      @click.stop="emit('toggle-star', child.id)"
                    >
                      <UIcon name="i-lucide-star" class="size-3" :class="child.starred ? 'text-amber-400' : 'text-stone-400'" />
                    </button>
                    <button
                      class="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Delete"
                      @click.stop="emit('delete-node', child.id)"
                    >
                      <UIcon name="i-lucide-trash-2" class="size-3 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Starred from other branches -->
      <div v-if="starredInsights.length" class="px-3 pt-2 pb-1">
        <p class="text-[10px] font-semibold text-muted uppercase tracking-wider px-1 mb-2">
          Starred from other branches
        </p>

        <div class="space-y-1">
          <button
            v-for="node in starredInsights"
            :key="node.id"
            class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-all group cursor-pointer"
            @click="emit('select-node', node.id)"
          >
            <div class="flex items-start gap-2">
              <UIcon name="i-lucide-star" class="size-3.5 mt-0.5 shrink-0 text-amber-400" />
              <p class="text-xs text-muted group-hover:text-highlighted leading-snug whitespace-pre-wrap">
                {{ node.content }}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Quick add footer -->
    <div v-if="nodeId" class="px-3 py-3 border-t border-default shrink-0">
      <div class="flex items-center gap-1.5 mb-2">
        <button
          v-for="t in quickAddTypes"
          :key="t.value"
          class="p-1 rounded transition-colors"
          :class="quickAddType === t.value ? 'bg-stone-100 dark:bg-stone-800' : 'hover:bg-muted/50'"
          :title="t.value"
          @click="quickAddType = t.value"
        >
          <UIcon :name="t.icon" class="size-3.5" :class="quickAddType === t.value ? t.color : 'text-stone-400'" />
        </button>
      </div>
      <form class="flex gap-2" @submit.prevent="handleQuickAdd">
        <UInput
          v-model="quickAddContent"
          :placeholder="`Add ${quickAddType} as child...`"
          size="sm"
          class="flex-1"
          @keydown.meta.enter="handleQuickAdd"
        />
        <UButton
          type="submit"
          icon="i-lucide-plus"
          size="sm"
          :disabled="!quickAddContent.trim()"
        />
      </form>
    </div>
  </div>
</template>
