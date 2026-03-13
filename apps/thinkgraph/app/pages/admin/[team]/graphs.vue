<script setup lang="ts">
import ThinkgraphDecisionsNode from '~/components/ThinkgraphDecisionsNode.vue'

definePageMeta({ layout: 'admin' })

// Register globally so CroutonFlow's resolveComponent() can find it
const nuxtApp = useNuxtApp()
if (!nuxtApp.vueApp.component('ThinkgraphDecisionsNode')) {
  nuxtApp.vueApp.component('ThinkgraphDecisionsNode', ThinkgraphDecisionsNode)
}

const { teamId } = useTeamContext()
const { open } = useCrouton()
const toast = useToast()

// ─── Workspace state ───
const selectedGraphId = ref<string | null>(null)
const layoutRef = ref<{ select: (item: any) => void; create: () => void } | null>(null)

// ─── Graphs list ───
const { items: graphs, pending: loadingGraphs, refresh: refreshGraphs } = await useCollectionQuery('thinkgraphGraphs')
const { create: createGraph, deleteItems: deleteGraphs } = useCollectionMutation('thinkgraphGraphs')

// ─── Create graph modal ───
const isCreateOpen = ref(false)
const createForm = reactive({ name: '', description: '' })
const createPending = ref(false)

async function handleCreate() {
  if (!createForm.name.trim()) return
  createPending.value = true
  try {
    const created = await createGraph({
      name: createForm.name,
      description: createForm.description,
    })
    isCreateOpen.value = false
    Object.assign(createForm, { name: '', description: '' })
    await refreshGraphs()
    if (created?.id) {
      layoutRef.value?.select(created)
    }
  } finally {
    createPending.value = false
  }
}

// ─── Decisions for selected graph ───
const decisions = ref<any[]>([])
const decisionsLoading = ref(false)

async function refreshDecisions() {
  if (!selectedGraphId.value || !teamId.value) {
    decisions.value = []
    return
  }
  decisionsLoading.value = true
  try {
    const result = await $fetch<any[]>(`/api/teams/${teamId.value}/thinkgraph-decisions`, {
      query: { graphId: selectedGraphId.value },
    })
    decisions.value = result || []
  } catch {
    decisions.value = []
  } finally {
    decisionsLoading.value = false
  }
}

const { deleteItems, create, update } = useCollectionMutation('thinkgraphDecisions')

// Auto-refresh graph when any thinkgraphDecisions mutation happens (local or remote)
nuxtApp.hook('crouton:mutation', ({ collection }: any) => {
  if (collection === 'thinkgraphDecisions') {
    refreshDecisions()
    layoutKey.value++
  }
})
nuxtApp.hook('crouton:remoteChange' as any, ({ collection }: any) => {
  if (collection === 'thinkgraphDecisions') {
    refreshDecisions()
    layoutKey.value++
  }
})

// ─── Graph canvas state ───
const expanding = ref<string | null>(null)
const showQuickAdd = ref(false)
const quickAddParentId = ref<string | undefined>()
const selectedNodeId = ref<string | null>(null)
const layoutKey = ref(0)

// Edge type toggle
const edgeTypes = ['default', 'smoothstep', 'straight'] as const
const edgeType = ref<'default' | 'smoothstep' | 'straight'>('smoothstep')

function cycleEdgeType() {
  const idx = edgeTypes.indexOf(edgeType.value)
  edgeType.value = edgeTypes[(idx + 1) % edgeTypes.length]
}

const edgeTypeIcon = computed(() => {
  switch (edgeType.value) {
    case 'default': return 'i-lucide-spline'
    case 'smoothstep': return 'i-lucide-git-commit-horizontal'
    case 'straight': return 'i-lucide-minus'
  }
})

const flowConfig = computed(() => ({
  direction: 'TB' as const,
  nodeSpacing: 80,
  rankSpacing: 160,
  nodeWidth: 260,
  nodeHeight: 200,
  edgeType: edgeType.value,
}))

function autoLayout() {
  savedPositions.value = null
  layoutKey.value++
}

// Flow config — persist node positions across reloads
const flowId = ref<string | null>(null)
const savedPositions = ref<Record<string, { x: number; y: number }> | null>(null)

async function ensureFlowConfig() {
  if (!teamId.value || !selectedGraphId.value) return

  const flowName = `thinkgraph-${selectedGraphId.value}`

  try {
    const flows = await $fetch<any[]>(`/api/crouton-flow/teams/${teamId.value}/flows`, {
      query: { collection: 'thinkgraphDecisions', name: flowName },
    })
    const existing = flows?.find((f: any) => f.name === flowName)
    if (existing) {
      flowId.value = existing.id
      savedPositions.value = existing.nodePositions || null
      return
    }
  } catch { /* no existing config */ }

  try {
    const created = await $fetch<any>(`/api/crouton-flow/teams/${teamId.value}/flows`, {
      method: 'POST',
      body: {
        name: flowName,
        collection: 'thinkgraphDecisions',
        labelField: 'content',
        parentField: 'parentId',
      },
    })
    if (created?.id) {
      flowId.value = created.id
    }
  } catch { /* flow config creation failed */ }
}

// Re-init flow config and load decisions when graph changes
watch(selectedGraphId, async (newId) => {
  // Reset graph canvas state
  flowId.value = null
  savedPositions.value = null
  selectedNodes.value = new Set()
  selectedNodeId.value = null
  showChat.value = false
  showFilters.value = false

  if (newId) {
    await refreshDecisions()
    layoutKey.value++
    await ensureFlowConfig()
  } else {
    decisions.value = []
  }
})

// Dispatch modal state
const showDispatch = ref(false)
const dispatchNodeId = ref<string | null>(null)
const dispatchNodeIds = ref<string[]>([])
const dispatchNodeContent = computed(() => {
  if (!dispatchNodeId.value) return undefined
  const node = decisions.value?.find((d: any) => d.id === dispatchNodeId.value)
  return node?.content?.slice(0, 100) || undefined
})

function openDispatch(nodeId: string) {
  dispatchNodeIds.value = [nodeId]
  dispatchNodeId.value = nodeId
  showDispatch.value = true
}

function openMultiDispatch(nodeIds: string[]) {
  dispatchNodeIds.value = nodeIds
  dispatchNodeId.value = nodeIds[0] || null
  showDispatch.value = true
}

async function onDispatched() {
  showDispatch.value = false
  await refreshDecisions()
  layoutKey.value++
}

// Chat panel state
const showChat = ref(false)
const chatNodeId = ref<string | null>(null)
const chatNodeName = computed(() => {
  if (!chatNodeId.value) return undefined
  const node = decisions.value?.find((d: any) => d.id === chatNodeId.value)
  return node?.content?.slice(0, 50) || undefined
})

// Multi-select for synthesis
const selectedNodes = ref<Set<string>>(new Set())
const selectedNodeIds = computed(() => Array.from(selectedNodes.value))

// Filter sidebar
const showFilters = ref(false)
const filtersRef = ref<{ filteredIds: Set<string> | null } | null>(null)

const { generateContext, copyContext } = useContextGenerator(decisions)

// Compute extra edges from synthesis artifacts (multi-parent connections)
const additionalEdges = computed(() => {
  if (!decisions.value) return []
  const edges: Array<{ id: string; source: string; target: string }> = []
  for (const d of decisions.value as any[]) {
    if (!Array.isArray(d.artifacts)) continue
    for (const a of d.artifacts) {
      if (a.type === 'synthesis' && Array.isArray(a.sourceNodeIds)) {
        for (const srcId of a.sourceNodeIds) {
          if (srcId !== d.parentId) {
            edges.push({ id: `e-synth-${srcId}-${d.id}`, source: srcId, target: d.id })
          }
        }
      }
    }
  }
  return edges
})

function addRootDecision() {
  if (!selectedGraphId.value) return
  open('create', 'thinkgraphDecisions', [], undefined, { graphId: selectedGraphId.value })
}

function onNodeClick(nodeId: string, data: Record<string, unknown>, event?: MouseEvent) {
  if (event?.shiftKey) return
  selectedNodeId.value = nodeId
  open('update', 'thinkgraphDecisions', [nodeId])
}

function onSelectionChange(nodeIds: string[]) {
  selectedNodes.value = new Set(nodeIds)
}

async function onNodeDelete(nodeIds: string[]) {
  await deleteItems(nodeIds)
  for (const id of nodeIds) selectedNodes.value.delete(id)
  await refreshDecisions()
}

async function expandWithAI(decisionId: string, mode?: string) {
  if (expanding.value) return
  expanding.value = decisionId

  try {
    await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/${decisionId}/expand`, {
      method: 'POST',
      body: { mode: mode || 'default' }
    })
    await refreshDecisions()
    layoutKey.value++
  } catch (error) {
    console.error('AI expand failed:', error)
  } finally {
    expanding.value = null
  }
}

function openQuickAdd(parentId?: string) {
  quickAddParentId.value = parentId
  showQuickAdd.value = true
}

async function onQuickAddDone() {
  showQuickAdd.value = false
  await refreshDecisions()
  layoutKey.value++
}

function openChat(nodeId: string) {
  chatNodeId.value = nodeId
  showChat.value = true
}

function openGlobalChat() {
  chatNodeId.value = null
  showChat.value = true
}

async function onChatAddToGraph(items: Array<{ content: string; nodeType: string; parentId?: string }>) {
  const fallbackParentId = chatNodeId.value || selectedNodeId.value || ''
  for (const item of items) {
    await create({
      content: item.content,
      nodeType: item.nodeType,
      pathType: '',
      graphId: selectedGraphId.value || '',
      parentId: item.parentId || fallbackParentId,
      source: 'ai',
      starred: false,
      branchName: '',
      versionTag: '',
      model: '',
    })
  }
  await refreshDecisions()
  layoutKey.value++
}

// Synthesis
const synthesizing = ref(false)
async function synthesizeSelected() {
  if (selectedNodes.value.size < 2 || synthesizing.value) return
  synthesizing.value = true

  try {
    await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/synthesize`, {
      method: 'POST',
      body: { nodeIds: Array.from(selectedNodes.value) }
    })
    selectedNodes.value.clear()
    await refreshDecisions()
    layoutKey.value++
  } catch (error) {
    console.error('Synthesis failed:', error)
  } finally {
    synthesizing.value = false
  }
}

// Brief generation
const generatingBrief = ref(false)
async function generateBrief(format: string) {
  if (selectedNodes.value.size === 0 || generatingBrief.value) return
  generatingBrief.value = true

  try {
    const result = await $fetch<{ brief: string }>(`/api/teams/${teamId.value}/thinkgraph-decisions/brief`, {
      method: 'POST',
      body: { ids: Array.from(selectedNodes.value), format },
    })
    if (result?.brief) {
      await navigator.clipboard.writeText(result.brief)
    }
  } catch (error) {
    console.error('Brief generation failed:', error)
  } finally {
    generatingBrief.value = false
  }
}

async function copySelectedContext() {
  for (const id of selectedNodes.value) {
    await copyContext(id)
  }
}

function deselectNode(id: string) {
  const s = new Set(selectedNodes.value)
  s.delete(id)
  selectedNodes.value = s
}

function clearSelection() {
  selectedNodes.value = new Set()
  selectedNodeId.value = null
}

async function toggleStar(nodeId: string) {
  const node = decisions.value?.find((d: any) => d.id === nodeId)
  if (!node) return
  await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/${nodeId}`, {
    method: 'PATCH',
    body: { starred: !node.starred },
  })
  await refreshDecisions()
}

async function togglePark(nodeId: string) {
  const node = decisions.value?.find((d: any) => d.id === nodeId)
  if (!node) return
  const newTag = node.versionTag === 'parked' ? 'v1' : 'parked'
  await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/${nodeId}`, {
    method: 'PATCH',
    body: { versionTag: newTag },
  })
  await refreshDecisions()
}

// Keyboard shortcuts
const { showHelp, pause, resume } = useGraphShortcuts(selectedNodeId, selectedNodes, {
  toggleStar,
  togglePark,
  addChild: (nodeId: string) => open('create', 'thinkgraphDecisions', [], undefined, { parentId: nodeId, graphId: selectedGraphId.value }),
  openQuickAdd,
  openSearch: () => { showFilters.value = true },
  clearSelection,
  deleteSelected: onNodeDelete,
  expandDefault: (nodeId: string) => expandWithAI(nodeId, 'default'),
  openChat,
  openGlobalChat,
})

// Pause shortcuts when modals are open
watch([showQuickAdd, showChat, showDispatch], ([qa, ch, dp]) => {
  if (qa || ch || dp) pause()
  else resume()
})

// Provide functions to child nodes
provide('thinkgraph:expand', expandWithAI)
provide('thinkgraph:expanding', expanding)
provide('thinkgraph:copyContext', copyContext)
provide('thinkgraph:openQuickAdd', openQuickAdd)
provide('thinkgraph:openChat', openChat)
provide('thinkgraph:dispatch', openDispatch)

// Selected graph info
const selectedGraph = computed(() =>
  graphs.value?.find((g: any) => g.id === selectedGraphId.value)
)
</script>

<template>
  <CroutonWorkspaceLayout
    ref="layoutRef"
    v-model="selectedGraphId"
    query-param="graph"
    title="ThinkGraph"
    sidebar-id="thinkgraph-sidebar"
  >
    <template #sidebar-actions>
      <UButton
        color="primary"
        variant="ghost"
        icon="i-lucide-plus"
        size="sm"
        @click="isCreateOpen = true"
      />
    </template>

    <template #sidebar="{ selectedId }">
      <div class="flex flex-col h-full">
        <!-- Loading -->
        <div v-if="loadingGraphs" class="p-6 flex justify-center">
          <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-muted" />
        </div>

        <!-- Empty -->
        <div
          v-else-if="!graphs?.length"
          class="p-6 text-center text-muted flex-1"
        >
          <UIcon name="i-lucide-brain-circuit" class="size-8 mb-2 opacity-50" />
          <p class="text-sm">No graphs yet</p>
          <UButton
            size="sm"
            color="primary"
            variant="soft"
            class="mt-3"
            @click="isCreateOpen = true"
          >
            New Graph
          </UButton>
        </div>

        <!-- Graph list -->
        <div v-else class="flex-1 overflow-auto">
          <ul role="list" class="divide-y divide-default">
            <li
              v-for="graph in graphs"
              :key="graph.id"
              class="group px-4 py-3 cursor-pointer transition-colors"
              :class="[
                selectedId === graph.id
                  ? 'bg-primary-50 dark:bg-primary-950/30 border-l-2 border-primary'
                  : 'hover:bg-muted/50 border-l-2 border-transparent'
              ]"
              @click="layoutRef?.select(graph)"
            >
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-brain-circuit" class="size-4 shrink-0 text-muted" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium truncate">{{ graph.name }}</p>
                  <p v-if="graph.description" class="text-xs text-muted truncate mt-0.5">
                    {{ graph.description }}
                  </p>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template #content>
      <div class="h-full flex flex-col">
        <!-- Toolbar -->
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-default bg-default shrink-0">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-brain-circuit" class="size-4 text-primary shrink-0" />
            <span class="font-medium text-highlighted truncate">{{ selectedGraph?.name }}</span>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-filter"
              size="sm"
              variant="ghost"
              color="neutral"
              title="Filters (/)"
              @click="showFilters = !showFilters"
            />
            <UButton
              icon="i-lucide-keyboard"
              size="sm"
              variant="ghost"
              color="neutral"
              title="Keyboard shortcuts (?)"
              @click="showHelp = true"
            />
            <UButton
              :icon="edgeTypeIcon"
              size="sm"
              variant="ghost"
              color="neutral"
              :title="`Edge style: ${edgeType}`"
              @click="cycleEdgeType"
            />
            <UButton
              icon="i-lucide-layout-grid"
              size="sm"
              variant="ghost"
              color="neutral"
              title="Auto-layout"
              @click="autoLayout"
            />
            <UButton
              icon="i-lucide-message-square-text"
              label="Chat"
              size="sm"
              variant="outline"
              color="neutral"
              @click="openGlobalChat"
            />
            <UButton
              icon="i-lucide-clipboard-paste"
              label="Paste"
              size="sm"
              variant="outline"
              color="neutral"
              @click="openQuickAdd()"
            />
            <UButton
              icon="i-lucide-plus"
              label="New Decision"
              size="sm"
              @click="addRootDecision"
            />
          </div>
        </div>

        <!-- Filter sidebar + Graph + Chat split -->
        <div class="flex-1 flex overflow-hidden">
          <!-- Filter sidebar -->
          <GraphFilters
            v-if="showFilters && decisions?.length"
            ref="filtersRef"
            :decisions="decisions"
          />

          <!-- Graph -->
          <div class="flex-1 relative">
            <CroutonFlow
              v-if="decisions?.length"
              :key="layoutKey"
              :rows="decisions"
              collection="thinkgraphDecisions"
              parent-field="parentId"
              label-field="content"
              data-mode="ephemeral"
              :flow-id="flowId || undefined"
              :saved-positions="savedPositions"
              :flow-config="flowConfig"
              :additional-edges="additionalEdges"
              minimap
              :selected="selectedNodeIds"
              @node-click="onNodeClick"
              @node-delete="onNodeDelete"
              @selection-change="onSelectionChange"
            />
            <div
              v-else
              class="h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600"
            >
              <UIcon name="i-lucide-brain-circuit" class="size-12 mb-4" />
              <p class="text-lg font-medium mb-2">Start thinking</p>
              <p class="text-sm mb-4">Add your first decision to begin exploring.</p>
              <div class="flex gap-2">
                <UButton
                  icon="i-lucide-clipboard-paste"
                  label="Paste AI Output"
                  variant="outline"
                  color="neutral"
                  @click="openQuickAdd()"
                />
                <UButton
                  icon="i-lucide-plus"
                  label="New Decision"
                  @click="addRootDecision"
                />
              </div>
            </div>
          </div>

          <!-- Chat panel (side panel) -->
          <div
            v-if="showChat"
            class="w-[380px] border-l border-neutral-200 dark:border-neutral-800 flex-shrink-0"
          >
            <ChatPanel
              :node-id="chatNodeId"
              :node-name="chatNodeName"
              :selected-node-ids="selectedNodeIds"
              :decisions="decisions"
              @add-to-graph="onChatAddToGraph"
              @close="showChat = false"
            />
          </div>
        </div>

        <!-- Selection Bar (floating, bottom) -->
        <SelectionBar
          :selected-ids="selectedNodeIds"
          :decisions="decisions || []"
          @synthesize="synthesizeSelected"
          @generate-brief="generateBrief"
          @copy-context="copySelectedContext"
          @dispatch="() => { if (selectedNodeIds.length > 0) openMultiDispatch(selectedNodeIds) }"
          @clear="clearSelection"
          @deselect="deselectNode"
        />
      </div>
    </template>

    <template #empty>
      <div class="flex-1 flex items-center justify-center text-muted">
        <div class="text-center max-w-md px-6">
          <div class="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-lucide-brain-circuit" class="size-8 text-muted" />
          </div>
          <h3 class="text-lg font-semibold mb-2">Select a graph</h3>
          <p class="text-sm text-muted mb-6">
            Choose a graph from the sidebar, or create a new one to start thinking.
          </p>
          <UButton color="primary" icon="i-lucide-plus" @click="isCreateOpen = true">
            Create new graph
          </UButton>
        </div>
      </div>
    </template>
  </CroutonWorkspaceLayout>

  <!-- Create graph modal -->
  <UModal v-model:open="isCreateOpen">
    <template #content="{ close }">
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4">New Graph</h3>
        <div class="flex flex-col gap-4">
          <UFormField label="Name" required>
            <UInput v-model="createForm.name" placeholder="e.g. Product Strategy" class="w-full" />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="createForm.description" placeholder="Optional description" class="w-full" />
          </UFormField>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <UButton color="neutral" variant="ghost" @click="close">Cancel</UButton>
          <UButton
            :loading="createPending"
            :disabled="!createForm.name.trim()"
            icon="i-lucide-plus"
            @click="handleCreate"
          >
            Create graph
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Quick Add Modal -->
  <UModal v-model:open="showQuickAdd">
    <template #content>
      <QuickAdd :parent-id="quickAddParentId" :graph-id="selectedGraphId || undefined" @added="onQuickAddDone" />
    </template>
  </UModal>

  <!-- Dispatch Modal -->
  <DispatchModal
    v-model:open="showDispatch"
    :decision-id="dispatchNodeId"
    :decision-ids="dispatchNodeIds"
    :decision-content="dispatchNodeContent"
    @dispatched="onDispatched"
  />

  <!-- Shortcuts Help Modal -->
  <ShortcutsHelp v-model:open="showHelp" />

  <!-- Crouton modal/slideover for CRUD -->
  <CroutonForm />
</template>
