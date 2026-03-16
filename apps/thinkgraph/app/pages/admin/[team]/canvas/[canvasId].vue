<script setup lang="ts">
import type { ThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/types'
import { CONNECT_NODE_TYPES } from '~/utils/thinkgraph-config'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const { teamId } = useTeamContext()
const { open } = useCrouton()
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

// ─── Node creation ───
function createNode(nodeType: string, parentId?: string) {
  open('create', 'thinkgraphNodes', [], undefined, {
    canvasId: canvasId.value,
    nodeType,
    status: nodeType === 'task' ? 'draft' : 'idle',
    origin: 'human',
    ...(parentId ? { parentId } : {}),
  })
}

const newNodeItems = computed(() => [
  [
    { label: 'Idea', icon: 'i-lucide-lightbulb', onSelect: () => createNode('idea') },
    { label: 'Question', icon: 'i-lucide-help-circle', onSelect: () => createNode('question') },
    { label: 'Decision', icon: 'i-lucide-check-circle', onSelect: () => createNode('decision') },
  ],
  [
    { label: 'Epic', icon: 'i-lucide-mountain', onSelect: () => createNode('epic') },
    { label: 'User Story', icon: 'i-lucide-user', onSelect: () => createNode('user_story') },
    { label: 'Task', icon: 'i-lucide-square-check', onSelect: () => createNode('task') },
  ],
  [
    { label: 'Milestone', icon: 'i-lucide-flag', onSelect: () => createNode('milestone') },
    { label: 'Remark', icon: 'i-lucide-message-circle', onSelect: () => createNode('remark') },
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
</script>

<template>
  <div class="h-full flex flex-col">
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
            v-if="statusSummary.working"
            class="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
          >
            {{ statusSummary.working }} working
          </span>
          <span
            v-if="statusSummary.needs_attention"
            class="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          >
            {{ statusSummary.needs_attention }} blocked
          </span>
          <span
            v-if="statusSummary.done"
            class="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          >
            {{ statusSummary.done }} done
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
        />
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
              @click="createNode('epic')"
            />
            <UButton
              icon="i-lucide-plus"
              label="Add Node"
              @click="createNode('idea')"
            />
          </div>
        </div>
      </div>

      <!-- Node detail panel (right side) -->
      <NodeDetail
        v-if="showDetail && selectedNode"
        :node="selectedNode"
        :nodes="nodes"
        @close="showDetail = false"
        @refresh="refreshNodes"
      />
    </div>

    <!-- Crouton CRUD modal -->
    <CroutonForm />
  </div>
</template>
