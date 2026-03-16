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
const showDetail = ref(false)

const selectedNode = computed(() =>
  nodes.value.find((n: ThinkgraphNode) => n.id === selectedNodeId.value),
)

function onNodeClick(nodeId: string, _data: Record<string, unknown>, event?: MouseEvent) {
  selectedNodeId.value = nodeId
  if (!event?.shiftKey) showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
  selectedNodeId.value = null
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

// ─── Keyboard shortcuts ───
const createInput = useTemplateRef<{ inputRef?: HTMLInputElement }>('createInput')

onKeyStroke('n', (e) => {
  // Don't trigger when typing in an input/textarea
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  e.preventDefault()
  openCreate('idea')
})

onKeyStroke('Escape', () => {
  if (showDetail.value) closeDetail()
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
          <CanvasHighlight :selected-node-id="selectedNodeId" :nodes="nodes" />
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
  </div>
</template>

<style>
/* Context chain highlight — unscoped to target Vue Flow internals */
.vue-flow__edge.context-chain-edge .vue-flow__edge-path {
  stroke: var(--color-primary-500, #3b82f6);
  stroke-width: 2.5;
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--color-primary-500) 40%, transparent));
  transition: stroke 0.3s ease, stroke-width 0.3s ease, filter 0.3s ease;
}

.vue-flow__edge.context-dimmed-edge .vue-flow__edge-path {
  stroke: #d4d4d4;
  opacity: 0.3;
  transition: stroke 0.3s ease, opacity 0.3s ease;
}

.dark .vue-flow__edge.context-dimmed-edge .vue-flow__edge-path {
  stroke: #404040;
  opacity: 0.3;
}

.vue-flow__node.context-dimmed {
  opacity: 0.35;
  transition: opacity 0.3s ease;
}
</style>
