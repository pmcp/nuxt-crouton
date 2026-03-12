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
const { deleteItems, create } = useCollectionMutation('thinkgraphDecisions')
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

const { generateContext, copyContext } = useContextGenerator(decisions)

function addRootDecision() {
  open('create', 'thinkgraphDecisions')
}

function onNodeClick(nodeId: string, data: Record<string, unknown>) {
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
    await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/${decisionId}/expand`, {
      method: 'POST',
      body: { mode: mode || 'default' }
    })
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

// Provide functions to child nodes
provide('thinkgraph:expand', expandWithAI)
provide('thinkgraph:expanding', expanding)
provide('thinkgraph:copyContext', copyContext)
provide('thinkgraph:openQuickAdd', openQuickAdd)
provide('thinkgraph:openChat', openChat)
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
        <!-- Synthesis button (visible when 2+ nodes selected) -->
        <UButton
          v-if="selectedNodes.size >= 2"
          icon="i-lucide-git-merge"
          :label="`Synthesize ${selectedNodes.size}`"
          size="sm"
          color="primary"
          variant="soft"
          :loading="synthesizing"
          @click="synthesizeSelected"
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

    <!-- Graph + Chat split -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Graph -->
      <div class="flex-1">
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

    <!-- Quick Add Modal -->
    <UModal v-model:open="showQuickAdd">
      <template #content>
        <QuickAdd :parent-id="quickAddParentId" @added="onQuickAddDone" />
      </template>
    </UModal>

    <!-- Crouton modal/slideover for CRUD -->
    <CroutonCollection collection="thinkgraphDecisions" @saved="refresh" />
  </div>
</template>
