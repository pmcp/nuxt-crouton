<script setup lang="ts">
import ThinkgraphDecisionsNode from '~/components/ThinkgraphDecisionsNode.vue'

// Register globally so CroutonFlow's resolveComponent() can find it
const app = useNuxtApp().vueApp
if (!app.component('ThinkgraphDecisionsNode')) {
  app.component('ThinkgraphDecisionsNode', ThinkgraphDecisionsNode)
}

const { teamId } = useTeamContext()

const { items: decisions, refresh } = await useCollectionQuery('thinkgraphDecisions')

const { open } = useCrouton()
const { deleteItems, create, update } = useCollectionMutation('thinkgraphDecisions')
const expanding = ref<string | null>(null)
const showQuickAdd = ref(false)
const quickAddParentId = ref<string | undefined>()
const selectedNodeId = ref<string | null>(null)

// Layout key — only increment when we want a full dagre re-layout
const layoutKey = ref(0)

// Flow config — persist node positions across reloads
const flowId = ref<string | null>(null)
const savedPositions = ref<Record<string, { x: number; y: number }> | null>(null)

async function ensureFlowConfig() {
  if (!teamId.value) return

  try {
    const flows = await $fetch<any[]>(`/api/crouton-flow/teams/${teamId.value}/flows`, {
      query: { collection: 'thinkgraphDecisions', name: 'thinkgraph-main' },
    })
    const existing = flows?.find((f: any) => f.name === 'thinkgraph-main')
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
        name: 'thinkgraph-main',
        collection: 'thinkgraphDecisions',
        labelField: 'content',
        parentField: 'parentId',
      },
    })
    if (created?.id) {
      flowId.value = created.id
    }
  } catch { /* flow config creation failed, positions won't persist */ }
}

await ensureFlowConfig()

// Dispatch modal state
const showDispatch = ref(false)
const dispatchNodeId = ref<string | null>(null)
const dispatchNodeContent = computed(() => {
  if (!dispatchNodeId.value) return undefined
  const node = decisions.value?.find((d: any) => d.id === dispatchNodeId.value)
  return node?.content?.slice(0, 100) || undefined
})

function openDispatch(nodeId: string) {
  dispatchNodeId.value = nodeId
  showDispatch.value = true
}

async function onDispatched() {
  showDispatch.value = false
  await refresh()
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

const showInspector = ref(false)

// Context mode: which nodes provide AI context
const contextMode = ref<'path' | 'selection'>('path')
const contextNodeIds = ref<string[]>([])

function useSelectionAsContext() {
  contextNodeIds.value = Array.from(selectedNodes.value)
  contextMode.value = 'selection'
  toast.add({
    title: `${contextNodeIds.value.length} nodes set as AI context`,
    icon: 'i-lucide-brain',
    color: 'info',
  })
}

function clearContextSelection() {
  contextMode.value = 'path'
  contextNodeIds.value = []
}

const { generateContext, copyContext } = useContextGenerator(decisions)

function addRootDecision() {
  open('create', 'thinkgraphDecisions')
}

function onNodeClick(nodeId: string, data: Record<string, unknown>, event?: MouseEvent) {
  // Shift+click for multi-select
  if (event?.shiftKey) {
    const s = new Set(selectedNodes.value)
    if (s.has(nodeId)) {
      s.delete(nodeId)
    } else {
      s.add(nodeId)
    }
    selectedNodes.value = s
    return
  }

  selectedNodeId.value = nodeId
  open('update', 'thinkgraphDecisions', [nodeId])
}

// Handle keyboard delete — Vue Flow removes visually, we persist to DB
async function onNodeDelete(nodeIds: string[]) {
  await deleteItems(nodeIds)
  for (const id of nodeIds) selectedNodes.value.delete(id)
  await refresh()
}

async function expandWithAI(decisionId: string, mode?: string) {
  if (expanding.value) return
  expanding.value = decisionId

  try {
    if (contextMode.value === 'selection' && contextNodeIds.value.length > 0) {
      await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/expand-with-context`, {
        method: 'POST',
        body: {
          nodeId: decisionId,
          mode: mode || 'default',
          contextNodeIds: contextNodeIds.value,
          includeAncestors: true,
        },
      })
    } else {
      await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/${decisionId}/expand`, {
        method: 'POST',
        body: { mode: mode || 'default' },
      })
    }
    await refresh()
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
  await refresh()
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

async function onChatAddToGraph(items: Array<{ content: string; nodeType: string }>) {
  for (const item of items) {
    await create({
      content: item.content,
      nodeType: item.nodeType,
      pathType: '',
      parentId: chatNodeId.value || '',
      source: 'ai',
      starred: false,
      pinned: false,
      branchName: '',
      versionTag: '',
      model: '',
    })
  }
  await refresh()
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
    await refresh()
    layoutKey.value++
  } catch (error) {
    console.error('Synthesis failed:', error)
  } finally {
    synthesizing.value = false
  }
}

// Resume briefing
const resuming = ref(false)
async function resumeGraph() {
  if (resuming.value) return
  resuming.value = true
  try {
    const result = await $fetch<{ briefing: string }>(`/api/teams/${teamId.value}/thinkgraph-decisions/resume`)
    if (result?.briefing) {
      await navigator.clipboard.writeText(result.briefing)
      toast.add({ title: 'Resume briefing copied to clipboard', icon: 'i-lucide-clipboard-check', color: 'success' })
    }
  } catch (error) {
    console.error('Resume failed:', error)
  } finally {
    resuming.value = false
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

// Copy combined context for selected nodes
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

// Toggle pin on a node
async function togglePin(nodeId: string) {
  const node = decisions.value?.find((d: any) => d.id === nodeId)
  if (!node) return
  await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/${nodeId}`, {
    method: 'PATCH',
    body: { pinned: !node.pinned },
  })
  await refresh()
}

// Toggle star on a node
async function toggleStar(nodeId: string) {
  const node = decisions.value?.find((d: any) => d.id === nodeId)
  if (!node) return
  await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/${nodeId}`, {
    method: 'PATCH',
    body: { starred: !node.starred },
  })
  await refresh()
}

// Toggle park (versionTag) on a node
async function togglePark(nodeId: string) {
  const node = decisions.value?.find((d: any) => d.id === nodeId)
  if (!node) return
  const newTag = node.versionTag === 'parked' ? 'v1' : 'parked'
  await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/${nodeId}`, {
    method: 'PATCH',
    body: { versionTag: newTag },
  })
  await refresh()
}

// Keyboard shortcuts
const { showHelp, pause, resume } = useGraphShortcuts(selectedNodeId, selectedNodes, {
  toggleStar,
  togglePark,
  addChild: (nodeId: string) => open('create', 'thinkgraphDecisions', [], undefined, { parentId: nodeId }),
  openQuickAdd,
  openSearch: () => { showFilters.value = true },
  clearSelection,
  deleteSelected: onNodeDelete,
  expandDefault: (nodeId: string) => expandWithAI(nodeId, 'default'),
  openChat,
  openGlobalChat,
  toggleInspector: () => { showInspector.value = !showInspector.value; if (showInspector.value) showChat.value = false },
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
provide('thinkgraph:contextNodeIds', contextNodeIds)
provide('thinkgraph:contextMode', contextMode)
provide('thinkgraph:togglePin', togglePin)
</script>

<template>
  <div class="h-screen flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-brain-circuit" class="size-5 text-primary-500" />
        <h1 class="text-lg font-semibold">ThinkGraph</h1>
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
          @click="showInspector = !showInspector; if (showInspector) showChat = false"
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
          :flow-id="flowId || undefined"
          :saved-positions="savedPositions"
          minimap
          @node-click="onNodeClick"
          @node-delete="onNodeDelete"
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

      <!-- Context Inspector panel -->
      <ContextInspector
        v-if="showInspector && !showChat && selectedNodeId"
        :node-id="selectedNodeId"
        :decisions="decisions || []"
      />

      <!-- Chat panel (side panel) -->
      <div
        v-if="showChat"
        class="w-[380px] border-l border-neutral-200 dark:border-neutral-800 flex-shrink-0"
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
      @dispatch="() => { if (selectedNodeIds.length > 0) openDispatch(selectedNodeIds[0]) }"
      @clear="clearSelection"
      @deselect="deselectNode"
    />

    <!-- Quick Add Modal -->
    <UModal v-model:open="showQuickAdd">
      <template #content>
        <QuickAdd :parent-id="quickAddParentId" @added="onQuickAddDone" />
      </template>
    </UModal>

    <!-- Dispatch Modal -->
    <DispatchModal
      v-model:open="showDispatch"
      :decision-id="dispatchNodeId"
      :decision-content="dispatchNodeContent"
      @dispatched="onDispatched"
    />

    <!-- Shortcuts Help Modal -->
    <ShortcutsHelp v-model:open="showHelp" />

    <!-- Crouton modal/slideover for CRUD -->
    <CroutonCollection collection="thinkgraphDecisions" @saved="refresh" />
  </div>
</template>
