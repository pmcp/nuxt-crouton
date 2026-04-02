<script setup lang="ts">
import ThinkgraphDecisionsNode from '~/components/ThinkgraphDecisionsNode.vue'
import type { ThinkgraphNode } from '../../layers/thinkgraph/collections/nodes/types'
import { CONNECT_NODE_TYPES } from '~/utils/thinkgraph-config'

interface Props {
  graphId: string
  graphName: string
  decisions: ThinkgraphNode[]
  decisionsLoading: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'refresh-decisions': []
}>()

const { teamId } = useTeamContext()
const { open } = useCrouton()
const toast = useToast()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// Register node component globally so CroutonFlow's resolveComponent() can find it
const nuxtApp = useNuxtApp()
if (!nuxtApp.vueApp.component('ThinkgraphDecisionsNode')) {
  nuxtApp.vueApp.component('ThinkgraphDecisionsNode', ThinkgraphDecisionsNode)
}

const { create, update, deleteItems } = useCollectionMutation('thinkgraphNodes')
const decisionsRef = computed(() => props.decisions)
const graphIdRef = computed(() => props.graphId)

// ─── Composables ───
const {
  expanding, layoutKey, edgeType, edgeTypeIcon, flowConfig,
  flowId, savedPositions, cycleEdgeType, autoLayout, ensureFlowConfig, resetCanvas,
} = useGraphCanvas(teamId, graphIdRef)

const {
  selectedNodeId, selectedNodes, selectedNodeIds,
  contextMode, contextNodeIds,
  onNodeClick: handleNodeClick, onSelectionChange, deselectNode, clearSelection,
  useSelectionAsContext, clearContextSelection,
} = useGraphSelection()

const {
  showPath, showChat, showFilters, showInspector,
  showQuickAdd, showTerminal, showDispatch,
  showSession, sessionNodeId, openSession,
  chatNodeId, chatNodeName, openChat, openGlobalChat,
  quickAddParentId, openQuickAdd,
  terminalNodeId, openTerminal,
  dispatchNodeId, dispatchNodeIds, dispatchNodeContent,
  openDispatch, openMultiDispatch,
} = useGraphPanels(decisionsRef)

const { generateContext, copyContext } = useContextGenerator(decisionsRef)

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
  decisions: decisionsRef,
  selectedGraphId: graphIdRef,
  expanding,
  contextMode,
  contextNodeIds,
  selectedNodes,
  chatNodeId,
  selectedNodeId,
  refreshDecisions: () => emit('refresh-decisions'),
  create,
  update,
  deleteItems,
  copyContext,
})

// ─── Filters ───
const { filters: graphFilters, filteredIds, activeFilterCount, availableBranches, availableVersionTags, clearFilters } = useGraphFilters(decisionsRef)

const visibleDecisions = computed(() => {
  if (!filteredIds.value) return props.decisions
  return props.decisions.filter(d => filteredIds.value!.has(d.id))
})

// ─── Additional edges (fan-in contextNodeIds + synthesis artifacts) ───
const additionalEdges = computed(() => {
  const edges: Array<{ id: string; source: string; target: string }> = []
  if (!props.decisions) return edges
  for (const d of props.decisions) {
    // Fan-in edges from contextNodeIds
    if (Array.isArray(d.contextNodeIds)) {
      for (const srcId of d.contextNodeIds) {
        if (srcId !== d.parentId) {
          edges.push({ id: `e-ctx-${srcId}-${d.id}`, source: srcId, target: d.id })
        }
      }
    }
    // Legacy synthesis artifact edges
    if (!Array.isArray(d.artifacts)) continue
    for (const a of d.artifacts) {
      if (a.type === 'synthesis' && Array.isArray((a as any).sourceNodeIds)) {
        for (const srcId of (a as any).sourceNodeIds) {
          if (srcId !== d.parentId && !(d.contextNodeIds || []).includes(srcId)) {
            edges.push({ id: `e-synth-${srcId}-${d.id}`, source: srcId, target: d.id })
          }
        }
      }
    }
  }
  return edges
})

// ─── Graph change watcher ───
watch(graphIdRef, async (newId) => {
  resetCanvas()
  selectedNodes.value = new Set()
  selectedNodeId.value = null
  showChat.value = false
  showFilters.value = false

  if (newId) {
    layoutKey.value++
    await ensureFlowConfig()
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
  emit('refresh-decisions')
}

async function onDispatched() {
  showDispatch.value = false
  emit('refresh-decisions')
}

function addRootDecision() {
  open('create', 'thinkgraphNodes', [], undefined, { graphId: props.graphId })
}

const newNodeItems = computed(() => [
  [
    { label: 'Idea', icon: 'i-lucide-lightbulb', onSelect: () => open('create', 'thinkgraphNodes', [], undefined, { graphId: props.graphId, nodeType: 'idea' }) },
    { label: 'Question', icon: 'i-lucide-help-circle', onSelect: () => open('create', 'thinkgraphNodes', [], undefined, { graphId: props.graphId, nodeType: 'question' }) },
    { label: 'Decision', icon: 'i-lucide-check-circle', onSelect: () => open('create', 'thinkgraphNodes', [], undefined, { graphId: props.graphId, nodeType: 'decision' }) },
  ],
  [
    { label: 'Epic', icon: 'i-lucide-mountain', onSelect: () => open('create', 'thinkgraphNodes', [], undefined, { graphId: props.graphId, nodeType: 'epic' }) },
    { label: 'User Story', icon: 'i-lucide-user', onSelect: () => open('create', 'thinkgraphNodes', [], undefined, { graphId: props.graphId, nodeType: 'user_story' }) },
    { label: 'Task', icon: 'i-lucide-square-check', onSelect: () => open('create', 'thinkgraphNodes', [], undefined, { graphId: props.graphId, nodeType: 'task', status: 'draft' }) },
  ],
  [
    { label: 'Milestone', icon: 'i-lucide-flag', onSelect: () => open('create', 'thinkgraphNodes', [], undefined, { graphId: props.graphId, nodeType: 'milestone' }) },
    { label: 'Remark', icon: 'i-lucide-message-circle', onSelect: () => open('create', 'thinkgraphNodes', [], undefined, { graphId: props.graphId, nodeType: 'remark' }) },
  ],
])

// ─── Keyboard shortcuts ───
const { showHelp, pause, resume } = useGraphShortcuts(selectedNodeId, selectedNodes, {
  toggleStar,
  togglePark,
  addChild: (nodeId: string) => open('create', 'thinkgraphNodes', [], undefined, { parentId: nodeId, graphId: props.graphId }),
  openQuickAdd,
  openSearch: () => { showFilters.value = true },
  clearSelection,
  expandDefault: (nodeId: string) => expandWithAI(nodeId, 'default'),
  openChat,
  openGlobalChat,
  toggleInspector: () => { showInspector.value = !showInspector.value; if (showInspector.value) showChat.value = false },
})

// Pause shortcuts when modals are open
watch([showQuickAdd, showChat, showDispatch, showDigest, showTerminal, showSession], ([qa, ch, dp, dg, tm, ss]) => {
  if (qa || ch || dp || dg || tm || ss) {
    pause()
    connectMenu.value.show = false
  }
  else resume()
})

// ─── Provide context to child components ───
provideThinkgraphContext({
  expand: expandWithAI,
  expanding,
  copyContext,
  openQuickAdd,
  openChat,
  openDispatch,
  openTerminal,
  openSession,
  togglePin,
  toggleStar,
  contextNodeIds,
  contextMode,
  focusInPath: (nodeId: string) => {
    selectedNodeId.value = nodeId
    showPath.value = true
  },
  graphId: graphIdRef,
})

function exportGraph() {
  exportGraphAction({ name: props.graphName } as any)
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-4 py-2.5 border-b border-default bg-default shrink-0">
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-brain-circuit" class="size-4 text-primary shrink-0" />
        <span class="font-medium text-highlighted truncate">{{ graphName }}</span>
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
          collection="thinkgraphNodes"
          parent-field="parentId"
          label-field="title"
          :flow-id="flowId"
          :saved-positions="savedPositions"
          :flow-config="flowConfig"
          :additional-edges="additionalEdges"
          :background-pattern-color="isDark ? '#3a3530' : '#d4cfc8'"
          sync
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
        :graph-id="graphId"
        @close="showPath = false"
        @select-node="(id: string) => { selectedNodeId = id }"
        @open-chat="openChat"
        @expand="(id: string, mode?: string) => expandWithAI(id, mode)"
        @dispatch="openDispatch"
        @edit="(id: string) => open('update', 'thinkgraphNodes', [id])"
        @add-child="(id: string) => open('create', 'thinkgraphNodes', [], undefined, { parentId: id, graphId })"
        @toggle-star="toggleStar"
        @delete-node="(id: string) => onNodeDelete([id])"
        @create-node="async (data: { content: string; nodeType: string; parentId: string }) => {
          await create({ ...data, graphId: graphId || '', pathType: '', source: 'manual', starred: false, branchName: '', versionTag: 'v1', model: '' })
          emit('refresh-decisions')
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
        class="w-[380px] border-l border-default flex-shrink-0 overflow-hidden"
      >
        <ChatPanel
          :node-id="chatNodeId"
          :node-name="chatNodeName"
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

  <!-- Quick Add Modal -->
  <UModal v-model:open="showQuickAdd">
    <template #content>
      <QuickAdd :parent-id="quickAddParentId" :graph-id="graphId || undefined" @added="onQuickAddDone" />
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

  <!-- Terminal Panel (Claude Code output — legacy) -->
  <TerminalPanel
    v-if="terminalNodeId"
    :node-id="terminalNodeId"
    :team-id="teamId || ''"
    :open="showTerminal"
    @update:open="showTerminal = $event"
  />

  <!-- Session Panel (Pi Agent — rich interactive session) -->
  <SessionPanel
    v-if="sessionNodeId"
    :node-id="sessionNodeId"
    :team-id="teamId || ''"
    :open="showSession"
    @update:open="showSession = $event"
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
