<script setup lang="ts">
import ThinkgraphDecisionsNode from '~/components/ThinkgraphDecisionsNode.vue'
import type { ThinkgraphDecision } from '../../../layers/thinkgraph/collections/decisions/types'
import { CONNECT_NODE_TYPES } from '~/utils/thinkgraph-config'
import {
  THINKGRAPH_EXPAND, THINKGRAPH_EXPANDING, THINKGRAPH_COPY_CONTEXT,
  THINKGRAPH_OPEN_QUICK_ADD, THINKGRAPH_OPEN_CHAT, THINKGRAPH_DISPATCH,
  THINKGRAPH_OPEN_TERMINAL, THINKGRAPH_TOGGLE_PIN, THINKGRAPH_TOGGLE_STAR,
  THINKGRAPH_CONTEXT_NODE_IDS, THINKGRAPH_CONTEXT_MODE, THINKGRAPH_FOCUS_IN_PATH,
} from '~/utils/thinkgraph-inject'

definePageMeta({ layout: 'admin' })

// Register globally so CroutonFlow's resolveComponent() can find it
const nuxtApp = useNuxtApp()
if (!nuxtApp.vueApp.component('ThinkgraphDecisionsNode')) {
  nuxtApp.vueApp.component('ThinkgraphDecisionsNode', ThinkgraphDecisionsNode)
}

const { teamId } = useTeamContext()
const { open } = useCrouton()
const toast = useToast()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// ─── Workspace state ───
const selectedGraphId = ref<string | null>(null)
const layoutRef = ref<{ select: (item: any) => void; create: () => void } | null>(null)

// ─── Graphs list ───
const { items: graphs, pending: loadingGraphs, refresh: refreshGraphs } = await useCollectionQuery('thinkgraphGraphs')
const { create: createGraph } = useCollectionMutation('thinkgraphGraphs')

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
const decisions = ref<ThinkgraphDecision[]>([])
const decisionsLoading = ref(false)

async function refreshDecisions() {
  if (!selectedGraphId.value || !teamId.value) {
    decisions.value = []
    return
  }
  decisionsLoading.value = true
  try {
    const result = await $fetch<ThinkgraphDecision[]>(`/api/teams/${teamId.value}/thinkgraph-decisions`, {
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
  }
})
nuxtApp.hook('crouton:remoteChange' as any, ({ collection }: any) => {
  if (collection === 'thinkgraphDecisions') {
    refreshDecisions()
  }
})

// ─── Composables ───
const {
  expanding, layoutKey, edgeType, edgeTypeIcon, flowConfig,
  flowId, savedPositions, cycleEdgeType, autoLayout, ensureFlowConfig, resetCanvas,
} = useGraphCanvas(teamId, selectedGraphId)

const {
  selectedNodeId, selectedNodes, selectedNodeIds,
  contextMode, contextNodeIds,
  onNodeClick: handleNodeClick, onSelectionChange, deselectNode, clearSelection,
  useSelectionAsContext, clearContextSelection,
} = useGraphSelection()

const {
  showPath, showChat, showFilters, showInspector,
  showQuickAdd, showTerminal, showDispatch,
  chatNodeId, chatNodeName, openChat, openGlobalChat,
  quickAddParentId, openQuickAdd,
  terminalNodeId, openTerminal,
  dispatchNodeId, dispatchNodeIds, dispatchNodeContent,
  openDispatch, openMultiDispatch,
} = useGraphPanels(decisions)

const { generateContext, copyContext } = useContextGenerator(decisions)

const {
  expandWithAI, toggleStar, togglePin, togglePark,
  synthesizing, synthesizeSelected,
  resuming, resumeGraph,
  showDigest, digestContent, digestLoading, generateDigest,
  generatingBrief, generateBrief,
  copySelectedContext,
  onChatAddToGraph,
  connectMenu, onConnectEnd, createFromConnect, closeConnectMenu,
  onNodeDelete,
  exportGraph: exportGraphAction,
} = useGraphActions({
  teamId,
  decisions,
  selectedGraphId,
  expanding,
  contextMode,
  contextNodeIds,
  selectedNodes,
  chatNodeId,
  selectedNodeId,
  refreshDecisions,
  create,
  update,
  deleteItems,
  copyContext,
})

// ─── Filters ───
const { filters: graphFilters, filteredIds, activeFilterCount, availableBranches, availableVersionTags, clearFilters } = useGraphFilters(decisions)

const visibleDecisions = computed(() => {
  if (!filteredIds.value) return decisions.value
  return decisions.value.filter(d => filteredIds.value!.has(d.id))
})

// ─── Additional edges (synthesis artifacts) ───
const additionalEdges = computed(() => {
  if (!decisions.value) return []
  const edges: Array<{ id: string; source: string; target: string }> = []
  for (const d of decisions.value) {
    if (!Array.isArray(d.artifacts)) continue
    for (const a of d.artifacts) {
      if (a.type === 'synthesis' && Array.isArray((a as any).sourceNodeIds)) {
        for (const srcId of (a as any).sourceNodeIds) {
          if (srcId !== d.parentId) {
            edges.push({ id: `e-synth-${srcId}-${d.id}`, source: srcId, target: d.id })
          }
        }
      }
    }
  }
  return edges
})

// ─── Graph change watcher ───
watch(selectedGraphId, async (newId) => {
  resetCanvas()
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

// ─── Node click with path panel ───
function onNodeClick(nodeId: string, data: Record<string, unknown>, event?: MouseEvent) {
  handleNodeClick(nodeId, data, event)
  if (!event?.shiftKey) showPath.value = true
}

// ─── Quick add done ───
async function onQuickAddDone() {
  showQuickAdd.value = false
  await refreshDecisions()
}

async function onDispatched() {
  showDispatch.value = false
  await refreshDecisions()
}

function addRootDecision() {
  if (!selectedGraphId.value) return
  open('create', 'thinkgraphDecisions', [], undefined, { graphId: selectedGraphId.value })
}

const newNodeItems = computed(() => [
  [
    { label: 'Idea', icon: 'i-lucide-lightbulb', onSelect: () => open('create', 'thinkgraphDecisions', [], undefined, { graphId: selectedGraphId.value, nodeType: 'idea' }) },
    { label: 'Question', icon: 'i-lucide-help-circle', onSelect: () => open('create', 'thinkgraphDecisions', [], undefined, { graphId: selectedGraphId.value, nodeType: 'question' }) },
    { label: 'Decision', icon: 'i-lucide-check-circle', onSelect: () => open('create', 'thinkgraphDecisions', [], undefined, { graphId: selectedGraphId.value, nodeType: 'decision' }) },
  ],
  [
    { label: 'Epic', icon: 'i-lucide-mountain', onSelect: () => open('create', 'thinkgraphDecisions', [], undefined, { graphId: selectedGraphId.value, nodeType: 'epic' }) },
    { label: 'User Story', icon: 'i-lucide-user', onSelect: () => open('create', 'thinkgraphDecisions', [], undefined, { graphId: selectedGraphId.value, nodeType: 'user_story' }) },
    { label: 'Task', icon: 'i-lucide-square-check', onSelect: () => open('create', 'thinkgraphDecisions', [], undefined, { graphId: selectedGraphId.value, nodeType: 'task', status: 'draft' }) },
  ],
  [
    { label: 'Milestone', icon: 'i-lucide-flag', onSelect: () => open('create', 'thinkgraphDecisions', [], undefined, { graphId: selectedGraphId.value, nodeType: 'milestone' }) },
    { label: 'Remark', icon: 'i-lucide-message-circle', onSelect: () => open('create', 'thinkgraphDecisions', [], undefined, { graphId: selectedGraphId.value, nodeType: 'remark' }) },
  ],
])

// ─── Keyboard shortcuts ───
const { showHelp, pause, resume } = useGraphShortcuts(selectedNodeId, selectedNodes, {
  toggleStar,
  togglePark,
  addChild: (nodeId: string) => open('create', 'thinkgraphDecisions', [], undefined, { parentId: nodeId, graphId: selectedGraphId.value }),
  openQuickAdd,
  openSearch: () => { showFilters.value = true },
  clearSelection,
  expandDefault: (nodeId: string) => expandWithAI(nodeId, 'default'),
  openChat,
  openGlobalChat,
  toggleInspector: () => { showInspector.value = !showInspector.value; if (showInspector.value) showChat.value = false },
})

// Pause shortcuts when modals are open
watch([showQuickAdd, showChat, showDispatch, showDigest, showTerminal], ([qa, ch, dp, dg, tm]) => {
  if (qa || ch || dp || dg || tm) {
    pause()
    connectMenu.value.show = false
  }
  else resume()
})

// ─── Provide to child nodes ───
provide(THINKGRAPH_EXPAND, expandWithAI)
provide(THINKGRAPH_EXPANDING, expanding)
provide(THINKGRAPH_COPY_CONTEXT, copyContext)
provide(THINKGRAPH_OPEN_QUICK_ADD, openQuickAdd)
provide(THINKGRAPH_OPEN_CHAT, openChat)
provide(THINKGRAPH_DISPATCH, openDispatch)
provide(THINKGRAPH_OPEN_TERMINAL, openTerminal)
provide(THINKGRAPH_TOGGLE_PIN, togglePin)
provide(THINKGRAPH_TOGGLE_STAR, toggleStar)
provide(THINKGRAPH_CONTEXT_NODE_IDS, contextNodeIds)
provide(THINKGRAPH_CONTEXT_MODE, contextMode)
provide(THINKGRAPH_FOCUS_IN_PATH, (nodeId: string) => {
  selectedNodeId.value = nodeId
  showPath.value = true
})

// ─── Derived state ───
const selectedGraph = computed(() =>
  graphs.value?.find(g => g.id === selectedGraphId.value),
)

function exportGraph() {
  exportGraphAction(selectedGraph.value)
}
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
            <!-- Context mode indicator -->
            <div v-if="contextMode === 'selection'" class="flex items-center gap-2 px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/30">
              <UIcon name="i-lucide-brain" class="size-3.5 text-violet-500" />
              <span class="text-xs text-violet-600 dark:text-violet-400">
                {{ contextNodeIds.length }} context nodes active
              </span>
              <UButton
                icon="i-lucide-x"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="clearContextSelection"
              />
            </div>
            <UButton
              icon="i-lucide-layers"
              size="sm"
              :variant="showInspector ? 'soft' : 'ghost'"
              :color="showInspector ? 'primary' : 'neutral'"
              title="Context inspector (i)"
              @click="() => { showInspector = !showInspector; if (showInspector) { showPath = false; showChat = false } }"
            />
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
              icon="i-lucide-route"
              size="sm"
              :variant="showPath ? 'soft' : 'ghost'"
              :color="showPath ? 'primary' : 'neutral'"
              title="Thinking path (t)"
              @click="showPath = !showPath"
            />
            <UButton
              icon="i-lucide-download"
              size="sm"
              variant="ghost"
              color="neutral"
              title="Export graph as markdown"
              @click="exportGraph"
            />
            <UButton
              icon="i-lucide-play"
              label="Resume"
              size="sm"
              variant="outline"
              color="neutral"
              :loading="resuming"
              title="Copy graph resume briefing to clipboard"
              @click="resumeGraph"
            />
            <UButton
              icon="i-lucide-scroll-text"
              size="sm"
              variant="ghost"
              color="neutral"
              title="Generate graph digest"
              :loading="digestLoading"
              @click="generateDigest"
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

        <!-- Filter sidebar + Graph + Chat split -->
        <div class="flex-1 flex overflow-hidden">
          <!-- Filter sidebar -->
          <GraphFilters
            v-if="showFilters && decisions?.length"
            :filters="graphFilters"
            :filtered-ids="filteredIds"
            :active-filter-count="activeFilterCount"
            :available-branches="availableBranches"
            :available-version-tags="availableVersionTags"
            :total-count="decisions.length"
            @clear-filters="clearFilters"
          />

          <!-- Graph -->
          <div class="flex-1 relative">
            <CroutonFlow
              v-if="decisions?.length && flowId"
              :key="layoutKey"
              :rows="visibleDecisions"
              collection="thinkgraphDecisions"
              parent-field="parentId"
              label-field="content"
              :flow-id="flowId"
              :saved-positions="savedPositions"
              :flow-config="flowConfig"
              :additional-edges="additionalEdges"
              :background-pattern-color="isDark ? '#3a3530' : '#d4cfc8'"
              minimap
              :selected="selectedNodeIds"
              @node-click="onNodeClick"
              @node-delete="onNodeDelete"
              @selection-change="onSelectionChange"
              @connect-end="onConnectEnd"
            />
            <div
              v-else
              class="h-full flex flex-col items-center justify-center text-muted"
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
                  label="New Node"
                  @click="addRootDecision"
                />
              </div>
            </div>
          </div>

          <!-- Thinking path panel (persistent right pane) -->
          <ThinkingPathPanel
            v-if="showPath && !showChat && !showInspector"
            :node-id="selectedNodeId"
            :decisions="decisions"
            :graph-id="selectedGraphId"
            @close="showPath = false"
            @select-node="(id: string) => { selectedNodeId = id }"
            @open-chat="openChat"
            @expand="(id: string, mode?: string) => expandWithAI(id, mode)"
            @dispatch="openDispatch"
            @edit="(id: string) => open('update', 'thinkgraphDecisions', [id])"
            @add-child="(id: string) => open('create', 'thinkgraphDecisions', [], undefined, { parentId: id, graphId: selectedGraphId })"
            @toggle-star="toggleStar"
            @delete-node="(id: string) => onNodeDelete([id])"
            @create-node="async (data: { content: string; nodeType: string; parentId: string }) => {
              await create({ ...data, graphId: selectedGraphId || '', pathType: '', source: 'manual', starred: false, branchName: '', versionTag: 'v1', model: '' })
              await refreshDecisions()
            }"
          />

          <!-- Context Inspector panel -->
          <ContextInspector
            v-if="showInspector && !showChat && selectedNodeId"
            :node-id="selectedNodeId"
            :decisions="decisions || []"
          />

          <!-- Chat panel (side panel) -->
          <div
            v-if="showChat"
            class="w-[380px] border-l border-default flex-shrink-0"
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
          @use-as-context="useSelectionAsContext"
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

  <!-- Digest Modal -->
  <UModal v-model:open="showDigest">
    <template #content="{ close }">
      <div class="p-6 max-h-[70vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-scroll-text" class="size-5 text-primary" />
            <h3 class="text-lg font-semibold">Graph Digest</h3>
          </div>
          <UButton
            icon="i-lucide-copy"
            size="sm"
            variant="ghost"
            color="neutral"
            title="Copy digest"
            @click="async () => { await navigator.clipboard.writeText(digestContent); toast.add({ title: 'Digest copied', color: 'success' }) }"
          />
        </div>
        <div class="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {{ digestContent }}
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <UButton color="neutral" variant="ghost" @click="close">Close</UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Terminal Panel (Claude Code output) -->
  <TerminalPanel
    v-if="terminalNodeId"
    :node-id="terminalNodeId"
    :team-id="teamId || ''"
    :open="showTerminal"
    @update:open="showTerminal = $event"
  />

  <!-- Crouton modal/slideover for CRUD -->
  <CroutonForm />

  <!-- Connect-to-create floating menu -->
  <Teleport to="body">
    <div
      v-if="connectMenu.show"
      class="fixed inset-0 z-[9999]"
      @click.self="closeConnectMenu"
      @contextmenu.prevent="closeConnectMenu"
    >
      <div
        class="absolute w-48 py-1.5 bg-default border border-default rounded-xl shadow-lg"
        :style="{ left: `${connectMenu.x}px`, top: `${connectMenu.y}px` }"
      >
        <p class="px-3 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider">
          Create node
        </p>
        <button
          v-for="nt in CONNECT_NODE_TYPES"
          :key="nt.id"
          class="flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm text-default hover:bg-elevated transition-colors cursor-pointer"
          @click="createFromConnect(nt.id)"
        >
          <UIcon :name="nt.icon" class="size-4" :class="nt.color" />
          {{ nt.label }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
