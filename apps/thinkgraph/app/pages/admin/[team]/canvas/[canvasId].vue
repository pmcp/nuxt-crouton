<script setup lang="ts">
import type { ThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/types'
import { CONNECT_NODE_TYPES, STATUS_CONFIG } from '~/utils/thinkgraph-config'
import ThinkgraphNodesNodeComponent from '~/components/ThinkgraphNodesNode.vue'

// Explicitly register so CroutonFlow's resolveComponent() can find it
const app = useNuxtApp().vueApp
if (!app.component('ThinkgraphNodesNode')) {
  app.component('ThinkgraphNodesNode', ThinkgraphNodesNodeComponent)
}
definePageMeta({ layout: 'admin' })

const route = useRoute()
const { teamId } = useTeamContext()
const nuxtApp = useNuxtApp()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const canvasId = computed(() => route.params.canvasId as string)

// ─── Canvas data ───
const { data: canvas } = await useFetch(() => `/api/teams/${teamId.value}/thinkgraph-canvases`, {
  transform: (items: any[]) => items?.find((c: any) => c.id === canvasId.value),
})

// ─── Nodes for this canvas ───
const nodes = ref<ThinkgraphNode[]>([])
const nodesLoading = ref(false)

async function refreshNodes() {
  if (!canvasId.value || !teamId.value) {
    nodes.value = []
    return
  }
  nodesLoading.value = true
  try {
    const result = await $fetch<ThinkgraphNode[]>(`/api/teams/${teamId.value}/thinkgraph-nodes`, {
      query: { canvasId: canvasId.value },
    })
    nodes.value = result || []
  }
  catch {
    nodes.value = []
  }
  finally {
    nodesLoading.value = false
  }
}

await refreshNodes()

// Auto-refresh on mutations
nuxtApp.hook('crouton:mutation', ({ collection }: any) => {
  if (collection === 'thinkgraphNodes') refreshNodes()
})
nuxtApp.hook('crouton:remoteChange' as any, ({ collection }: any) => {
  if (collection === 'thinkgraphNodes') refreshNodes()
})

// ─── Selection ───
const selectedNodeId = ref<string | null>(null)
const multiSelectedIds = ref<string[]>([])
const showDetail = ref(false)

const selectedNode = computed(() =>
  nodes.value.find((n: ThinkgraphNode) => n.id === selectedNodeId.value),
)

function onNodeClick(nodeId: string, _data: Record<string, unknown>, event?: MouseEvent) {
  if (event?.shiftKey) {
    // Multi-select: toggle node in selection
    const idx = multiSelectedIds.value.indexOf(nodeId)
    if (idx >= 0) {
      multiSelectedIds.value = multiSelectedIds.value.filter(id => id !== nodeId)
    }
    else {
      multiSelectedIds.value = [...multiSelectedIds.value, nodeId]
    }
    return
  }
  // Single select
  multiSelectedIds.value = []
  selectedNodeId.value = nodeId
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
  selectedNodeId.value = null
}

function deselectNode(id: string) {
  multiSelectedIds.value = multiSelectedIds.value.filter(i => i !== id)
}

function clearMultiSelect() {
  multiSelectedIds.value = []
}

// ─── Quick-create ───
const showCreate = ref(false)
const createTitle = ref('')
const createType = ref('idea')
const createParentId = ref<string | undefined>()
const createPending = ref(false)

function openCreate(nodeType: string, parentId?: string) {
  createType.value = nodeType
  createParentId.value = parentId
  createTitle.value = ''
  showCreate.value = true
}

function openDetail(nodeId: string) {
  selectedNodeId.value = nodeId
  showDetail.value = true
}

// Provide actions to child components (ThinkgraphNodesNode)
provide('canvasActions', { openCreate, openDetail })

async function handleCreate() {
  if (!createTitle.value.trim() || !teamId.value) return
  createPending.value = true
  try {
    await $fetch(`/api/teams/${teamId.value}/thinkgraph-nodes`, {
      method: 'POST',
      body: {
        canvasId: canvasId.value,
        title: createTitle.value.trim(),
        nodeType: createType.value,
        status: createType.value === 'task' ? 'draft' : 'idle',
        origin: 'human',
        contextScope: 'branch',
        ...(createParentId.value ? { parentId: createParentId.value } : {}),
      },
    })
    showCreate.value = false
    await refreshNodes()
  }
  finally {
    createPending.value = false
  }
}

const newNodeItems = computed(() => [
  [
    { label: 'Idea', icon: 'i-lucide-lightbulb', onSelect: () => openCreate('idea') },
    { label: 'Question', icon: 'i-lucide-help-circle', onSelect: () => openCreate('question') },
    { label: 'Decision', icon: 'i-lucide-check-circle', onSelect: () => openCreate('decision') },
  ],
  [
    { label: 'Epic', icon: 'i-lucide-mountain', onSelect: () => openCreate('epic') },
    { label: 'User Story', icon: 'i-lucide-user', onSelect: () => openCreate('user_story') },
    { label: 'Task', icon: 'i-lucide-square-check', onSelect: () => openCreate('task') },
  ],
  [
    { label: 'Milestone', icon: 'i-lucide-flag', onSelect: () => openCreate('milestone') },
    { label: 'Remark', icon: 'i-lucide-message-circle', onSelect: () => openCreate('remark') },
  ],
])

// ─── Status summary ───
const statusSummary = computed(() => {
  const counts: Record<string, number> = {}
  for (const n of nodes.value) {
    counts[n.status] = (counts[n.status] || 0) + 1
  }
  return counts
})

const STATUS_PILL_CLASSES: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  idle: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  thinking: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  working: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  blocked: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400',
  needs_attention: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function statusPillClass(status: string): string {
  return STATUS_PILL_CLASSES[status] || STATUS_PILL_CLASSES.idle
}

// ─── Search & Filter ───
const searchQuery = ref('')
const filterStatus = ref<string | undefined>()
const filterType = ref<string | undefined>()
const showSearch = ref(false)
const searchInput = useTemplateRef<{ inputRef?: HTMLInputElement }>('searchInput')

const searchMatchIds = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  const status = filterStatus.value
  const type = filterType.value
  if (!q && !status && !type) return null // null = no filtering
  return new Set(
    nodes.value
      .filter((n) => {
        if (q && !n.title.toLowerCase().includes(q)) return false
        if (status && n.status !== status) return false
        if (type && n.nodeType !== type) return false
        return true
      })
      .map(n => n.id),
  )
})

const statusFilterItems = computed(() => [
  [{ label: 'All statuses', onSelect: () => { filterStatus.value = undefined } }],
  ...Object.keys(STATUS_CONFIG).map(s => [{
    label: s.replace('_', ' '),
    icon: STATUS_CONFIG[s]?.icon || undefined,
    onSelect: () => { filterStatus.value = s },
  }]),
])

const typeFilterItems = computed(() => [
  [{ label: 'All types', onSelect: () => { filterType.value = undefined } }],
  ...[...new Set(nodes.value.map(n => n.nodeType))].map(t => [{
    label: t.replace('_', ' '),
    onSelect: () => { filterType.value = t },
  }]),
])

// ─── QuickAdd & PathType modals ───
const showQuickAdd = ref(false)
const showPathType = ref(false)
const pathTypeParentId = ref<string | undefined>()

function openQuickAdd(parentId?: string) {
  createParentId.value = parentId
  showQuickAdd.value = true
}

function openPathType(parentId?: string) {
  pathTypeParentId.value = parentId
  showPathType.value = true
}

async function handlePathSelect(pathType: string, method: string) {
  showPathType.value = false
  if (method === 'copy') {
    // Copy context for this node to clipboard
    if (selectedNodeId.value) {
      const nodesRef = computed(() => nodes.value)
      const { buildContext } = useNodeContext(nodesRef)
      const payload = buildContext(selectedNodeId.value)
      if (payload.markdown) {
        await navigator.clipboard.writeText(payload.markdown)
        useToast().add({ title: 'Context copied to clipboard', color: 'success' })
      }
    }
    return
  }
  // For other methods, create a child node with the path type set
  if (!teamId.value) return
  const parentId = pathTypeParentId.value || selectedNodeId.value
  await $fetch(`/api/teams/${teamId.value}/thinkgraph-nodes`, {
    method: 'POST',
    body: {
      canvasId: canvasId.value,
      title: `${pathType} from ${selectedNode.value?.title || 'node'}`,
      nodeType: pathType === 'converge' ? 'decision' : 'idea',
      status: 'idle',
      origin: 'human',
      contextScope: 'branch',
      ...(parentId ? { parentId } : {}),
    },
  })
  await refreshNodes()
}

// ─── Selection bar actions ───
const toast = useToast()

async function handleCopyContext() {
  const nodesRef = computed(() => nodes.value)
  const { buildContext } = useNodeContext(nodesRef)
  // Build context for all selected nodes
  const contexts = multiSelectedIds.value
    .map(id => buildContext(id))
    .filter(c => c.markdown)
  if (contexts.length === 0) return
  const combined = contexts.map(c => c.markdown).join('\n\n---\n\n')
  await navigator.clipboard.writeText(combined)
  toast.add({ title: `Context for ${contexts.length} nodes copied`, color: 'success' })
}

async function handleUseAsContext() {
  // Set the last selected node's contextScope to manual with the other selected nodes as context
  if (multiSelectedIds.value.length < 2) return
  const targetId = multiSelectedIds.value[multiSelectedIds.value.length - 1]
  const contextIds = multiSelectedIds.value.slice(0, -1)
  const { update } = useCollectionMutation('thinkgraphNodes')
  await update(targetId, { contextScope: 'manual', contextNodeIds: contextIds })
  toast.add({ title: `Set ${contextIds.length} nodes as manual context`, color: 'success' })
  multiSelectedIds.value = []
  selectedNodeId.value = targetId
  showDetail.value = true
  await refreshNodes()
}

async function handleSynthesize() {
  if (multiSelectedIds.value.length < 2 || !teamId.value) return
  const nodesRef = computed(() => nodes.value)
  const { buildContext } = useNodeContext(nodesRef)
  // Build combined context from all selected
  const titles = multiSelectedIds.value
    .map(id => nodes.value.find(n => n.id === id)?.title)
    .filter(Boolean)
  await $fetch(`/api/teams/${teamId.value}/thinkgraph-nodes`, {
    method: 'POST',
    body: {
      canvasId: canvasId.value,
      title: `Synthesis: ${titles.slice(0, 3).join(', ')}${titles.length > 3 ? '...' : ''}`,
      nodeType: 'decision',
      status: 'idle',
      origin: 'human',
      contextScope: 'manual',
      contextNodeIds: multiSelectedIds.value,
    },
  })
  toast.add({ title: 'Convergence node created', color: 'success' })
  multiSelectedIds.value = []
  await refreshNodes()
}

async function handleGenerateBrief(format: string) {
  const nodesRef = computed(() => nodes.value)
  const { buildContext } = useNodeContext(nodesRef)
  const contexts = multiSelectedIds.value
    .map(id => buildContext(id))
    .filter(c => c.markdown)
  if (contexts.length === 0) return

  let output = ''
  if (format === 'markdown') {
    output = contexts.map(c => c.markdown).join('\n\n---\n\n')
  }
  else if (format === 'ai-prompt') {
    const nodesList = multiSelectedIds.value
      .map(id => nodes.value.find(n => n.id === id))
      .filter(Boolean)
    output = `You are continuing a thinking exploration.\n\n## Selected nodes\n${nodesList.map(n => `- **${n!.title}** (${n!.nodeType})`).join('\n')}\n\n## Context\n${contexts.map(c => c.markdown).join('\n\n')}\n\n## Task\nSynthesize these ideas into a coherent approach. Identify patterns, resolve tensions, and propose a unified direction.`
  }
  else if (format === 'dev-brief') {
    const nodesList = multiSelectedIds.value
      .map(id => nodes.value.find(n => n.id === id))
      .filter(Boolean)
    output = `# Development Brief\n\n## Goals\n${nodesList.map(n => `- ${n!.title}`).join('\n')}\n\n## Context\n${contexts.map(c => c.markdown).join('\n\n')}\n\n## Acceptance Criteria\n- [ ] TODO\n\n## Notes\nGenerated from ${contexts.length} nodes, ~${contexts.reduce((sum, c) => sum + c.tokenEstimate, 0)} tokens of context.`
  }

  await navigator.clipboard.writeText(output)
  toast.add({ title: `${format} brief copied to clipboard`, color: 'success' })
}

// ─── Quick status change for selected node ───
const { update: updateNode } = useCollectionMutation('thinkgraphNodes')

async function setSelectedNodeStatus(status: string) {
  if (!selectedNodeId.value) return
  await updateNode(selectedNodeId.value, { status })
  toast.add({ title: `Status: ${status.replace('_', ' ')}`, color: 'success' })
  await refreshNodes()
}

// ─── Keyboard shortcuts ───
const createInput = useTemplateRef<{ inputRef?: HTMLInputElement }>('createInput')

onKeyStroke('n', (e) => {
  // Don't trigger when typing in an input/textarea
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  e.preventDefault()
  openCreate('idea')
})

onKeyStroke('q', (e) => {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  e.preventDefault()
  openQuickAdd()
})

onKeyStroke('p', (e) => {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (!selectedNodeId.value) return
  e.preventDefault()
  openPathType()
})

onKeyStroke('/', (e) => {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  e.preventDefault()
  showSearch.value = true
  nextTick(() => searchInput.value?.inputRef?.focus())
})

onKeyStroke('d', (e) => {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (!selectedNodeId.value) return
  e.preventDefault()
  setSelectedNodeStatus('done')
})

onKeyStroke('w', (e) => {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (!selectedNodeId.value) return
  e.preventDefault()
  setSelectedNodeStatus('working')
})

onKeyStroke('Escape', () => {
  if (showQuickAdd.value) { showQuickAdd.value = false; return }
  if (showPathType.value) { showPathType.value = false; return }
  if (showDetail.value) closeDetail()
  else if (multiSelectedIds.value.length) clearMultiSelect()
  else if (selectedNodeId.value) selectedNodeId.value = null
})

// Auto-focus the title input when the create modal opens
watch(showCreate, async (open) => {
  if (open) {
    await nextTick()
    createInput.value?.inputRef?.focus()
  }
})
</script>

<template>
  <div class="h-full w-full flex flex-col flex-1 min-w-0">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-4 py-2.5 border-b border-default bg-default shrink-0">
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-arrow-left"
          size="sm"
          variant="ghost"
          color="neutral"
          :to="`/admin/${teamId}/canvases`"
        />
        <UIcon name="i-lucide-layout-dashboard" class="size-4 text-primary shrink-0" />
        <span class="font-medium text-highlighted truncate">{{ canvas?.title || 'Canvas' }}</span>

        <!-- Status summary pills -->
        <div class="flex items-center gap-1.5 ml-4">
          <span
            v-for="(count, status) in statusSummary"
            :key="status"
            class="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            :class="statusPillClass(status as string)"
          >
            <UIcon v-if="STATUS_CONFIG[status]?.icon" :name="STATUS_CONFIG[status].icon" class="size-3" />
            {{ count }}
            <span class="hidden sm:inline">{{ (status as string).replace('_', ' ') }}</span>
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Search -->
        <div v-if="showSearch" class="flex items-center gap-1.5">
          <UInput
            ref="searchInput"
            v-model="searchQuery"
            size="sm"
            placeholder="Search nodes..."
            icon="i-lucide-search"
            class="w-48"
            @keydown.escape="showSearch = false; searchQuery = ''"
          />
          <UDropdownMenu :items="statusFilterItems">
            <UButton
              size="xs"
              variant="outline"
              color="neutral"
              :label="filterStatus ? filterStatus.replace('_', ' ') : 'Status'"
              :icon="filterStatus ? STATUS_CONFIG[filterStatus]?.icon : undefined"
            />
          </UDropdownMenu>
          <UDropdownMenu :items="typeFilterItems">
            <UButton
              size="xs"
              variant="outline"
              color="neutral"
              :label="filterType ? filterType.replace('_', ' ') : 'Type'"
            />
          </UDropdownMenu>
          <UButton
            icon="i-lucide-x"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="showSearch = false; searchQuery = ''; filterStatus = undefined; filterType = undefined"
          />
        </div>
        <UButton
          v-else
          icon="i-lucide-search"
          size="sm"
          variant="ghost"
          color="neutral"
          @click="showSearch = true; nextTick(() => searchInput?.inputRef?.focus())"
        />

        <UButton
          icon="i-lucide-clipboard-paste"
          label="Quick Add"
          size="sm"
          variant="outline"
          color="neutral"
          @click="openQuickAdd()"
        />
        <UButton
          v-if="selectedNodeId"
          icon="i-lucide-git-branch-plus"
          label="Path"
          size="sm"
          variant="outline"
          color="neutral"
          @click="openPathType()"
        />
        <UDropdownMenu :items="newNodeItems">
          <UButton
            icon="i-lucide-plus"
            label="New Node"
            size="sm"
            trailing-icon="i-lucide-chevron-down"
          />
        </UDropdownMenu>
      </div>
    </div>

    <!-- Canvas area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Graph -->
      <div class="flex-1 relative">
        <CroutonFlow
          v-if="nodes.length"
          :rows="nodes"
          collection="thinkgraphNodes"
          parent-field="parentId"
          label-field="title"
          :flow-id="canvasId"
          :background-pattern-color="isDark ? '#3a3530' : '#d4cfc8'"
          sync
          minimap
          @node-click="onNodeClick"
        >
          <CanvasHighlight :selected-node-id="selectedNodeId" :nodes="nodes" :search-match-ids="searchMatchIds" />
        </CroutonFlow>
        <div
          v-else
          class="h-full flex flex-col items-center justify-center text-muted"
        >
          <UIcon name="i-lucide-layout-dashboard" class="size-12 mb-4" />
          <p class="text-lg font-medium mb-2">Empty canvas</p>
          <p class="text-sm mb-4">Add your first node to start coordinating.</p>
          <div class="flex gap-2">
            <UButton
              icon="i-lucide-mountain"
              label="Add Epic"
              variant="outline"
              color="neutral"
              @click="openCreate('epic')"
            />
            <UButton
              icon="i-lucide-plus"
              label="Add Node"
              @click="openCreate('idea')"
            />
          </div>
        </div>
      </div>

      <!-- Node detail panel (right side) -->
      <NodeDetail
        v-if="showDetail && selectedNode"
        :node="selectedNode"
        :nodes="nodes"
        @close="closeDetail"
        @refresh="refreshNodes"
      />
    </div>

    <!-- Quick-create modal -->
    <UModal v-model:open="showCreate">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">
            New {{ createType.replace('_', ' ') }}
          </h3>
          <UFormField label="Title" required>
            <UInput
              ref="createInput"
              v-model="createTitle"
              :placeholder="`What is this ${createType.replace('_', ' ')} about?`"
              class="w-full"
              autofocus
              @keydown.enter="handleCreate"
            />
          </UFormField>
          <div class="flex justify-end gap-2 mt-6">
            <UButton color="neutral" variant="ghost" @click="close">Cancel</UButton>
            <UButton
              :loading="createPending"
              :disabled="!createTitle.trim()"
              icon="i-lucide-plus"
              @click="handleCreate"
            >
              Create
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- QuickAdd modal -->
    <UModal v-model:open="showQuickAdd">
      <template #content>
        <QuickAdd
          :canvas-id="canvasId"
          :parent-id="createParentId"
          @added="refreshNodes"
          @close="showQuickAdd = false"
        />
      </template>
    </UModal>

    <!-- PathType modal -->
    <UModal v-model:open="showPathType">
      <template #content>
        <PathTypeModal
          :node-title="selectedNode?.title"
          @select="handlePathSelect"
          @close="showPathType = false"
        />
      </template>
    </UModal>

    <!-- Multi-select floating bar -->
    <SelectionBar
      :selected-ids="multiSelectedIds"
      :nodes="nodes"
      @copy-context="handleCopyContext"
      @use-as-context="handleUseAsContext"
      @synthesize="handleSynthesize"
      @generate-brief="handleGenerateBrief"
      @deselect="deselectNode"
      @clear="clearMultiSelect"
    />
  </div>
</template>

<style>
/* Context chain highlight — unscoped to target Vue Flow internals */
.vue-flow__edge.context-chain-edge .vue-flow__edge-path {
  stroke: var(--color-primary-500, #3b82f6);
  stroke-width: 2.5;
  stroke-dasharray: 8 4;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--color-primary-500) 50%, transparent));
  animation: context-flow 0.8s linear infinite;
  transition: stroke 0.3s ease, stroke-width 0.3s ease, filter 0.3s ease;
}

@keyframes context-flow {
  to {
    stroke-dashoffset: -12;
  }
}

.vue-flow__edge.context-dimmed-edge .vue-flow__edge-path {
  stroke: #d4d4d4;
  opacity: 0.2;
  transition: stroke 0.3s ease, opacity 0.3s ease;
}

.dark .vue-flow__edge.context-dimmed-edge .vue-flow__edge-path {
  stroke: #404040;
  opacity: 0.2;
}

.vue-flow__node.context-dimmed {
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.vue-flow__node.search-match {
  box-shadow: 0 0 0 2px var(--color-primary-500, #3b82f6), 0 0 12px color-mix(in srgb, var(--color-primary-500) 30%, transparent);
  transition: box-shadow 0.3s ease;
}
</style>
