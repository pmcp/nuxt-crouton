<script setup lang="ts">
import type { ThinkgraphWorkItem } from '~~/layers/thinkgraph/collections/workitems/types'
import ThinkgraphWorkitemsNodeComponent from '~/components/ThinkgraphWorkitemsNode.vue'

// Explicitly register so CroutonFlow's resolveComponent() can find it
const app = useNuxtApp().vueApp
// CroutonFlow resolves collection "workItems" → PascalCase "WorkItemsNode"
if (!app.component('WorkItemsNode')) {
  app.component('WorkItemsNode', ThinkgraphWorkitemsNodeComponent)
}
definePageMeta({ layout: 'admin' })

const route = useRoute()
const { teamId } = useTeamContext()
const nuxtApp = useNuxtApp()
const toast = useToast()

const projectId = computed(() => route.params.projectId as string)

// ─── Project data ───
const { data: project, refresh: refreshProject } = await useFetch(
  () => `/api/teams/${teamId.value}/thinkgraph-projects`,
  { transform: (items: any[]) => items?.find((p: any) => p.id === projectId.value) },
)

// ─── Flow config ───
const flowId = ref<string | null>(null)
const savedPositions = ref<Record<string, { x: number; y: number }> | null>(null)
const flowKey = ref(0) // increment to force re-render

async function ensureFlowConfig() {
  if (!projectId.value || !teamId.value) return

  const flowName = `project-${projectId.value}`

  try {
    const flows = await $fetch<any[]>(`/api/crouton-flow/teams/${teamId.value}/flows`, {
      query: { collection: 'thinkgraphWorkItems', name: flowName },
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
        collection: 'thinkgraphWorkItems',
        labelField: 'title',
        parentField: 'parentId',
      },
    })
    if (created?.id) {
      flowId.value = created.id
    }
  } catch { /* flow config creation failed */ }
}

// ─── Work items ───
const items = ref<ThinkgraphWorkItem[]>([])
const itemsLoading = ref(false)

async function refreshItems() {
  if (!projectId.value || !teamId.value) {
    items.value = []
    return
  }
  itemsLoading.value = true
  try {
    const result = await $fetch<ThinkgraphWorkItem[]>(
      `/api/teams/${teamId.value}/thinkgraph-workitems`,
      { query: { projectId: projectId.value } },
    )
    items.value = result || []
  }
  catch {
    items.value = []
  }
  finally {
    itemsLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([ensureFlowConfig(), refreshItems()])
})

// Auto-refresh on mutations
nuxtApp.hook('crouton:mutation', ({ collection }: any) => {
  if (collection === 'thinkgraphWorkItems') refreshItems()
})
nuxtApp.hook('crouton:remoteChange' as any, ({ collection }: any) => {
  if (collection === 'thinkgraphWorkItems') refreshItems()
})

// Poll while any item is active (Pi agent working)
const hasActiveWork = computed(() =>
  items.value.some(n => n.status === 'active'),
)
let pollTimer: ReturnType<typeof setInterval> | null = null
watch(hasActiveWork, (active) => {
  if (active && !pollTimer) {
    pollTimer = setInterval(() => refreshItems(), 3000)
  } else if (!active && pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
    refreshItems()
  }
}, { immediate: true })
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

// ─── Selection ───
const selectedItemId = ref<string | null>(null)
const showDetail = ref(false)

const selectedItem = computed(() =>
  items.value.find(n => n.id === selectedItemId.value),
)

function onNodeClick(nodeId: string) {
  selectedItemId.value = nodeId
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
  selectedItemId.value = null
}

// ─── Create work item ───
const showCreate = ref(false)
const createTitle = ref('')
const createType = ref('generate')
const createParentId = ref<string | undefined>()
const createPending = ref(false)

const WORK_TYPES = [
  { value: 'discover', label: 'Discover', icon: 'i-lucide-search' },
  { value: 'architect', label: 'Architect', icon: 'i-lucide-pencil-ruler' },
  { value: 'generate', label: 'Generate', icon: 'i-lucide-hammer' },
  { value: 'compose', label: 'Compose', icon: 'i-lucide-layout' },
  { value: 'review', label: 'Review', icon: 'i-lucide-eye' },
  { value: 'deploy', label: 'Deploy', icon: 'i-lucide-rocket' },
]

const ASSIGNEES = [
  { value: 'pi', label: 'Pi.dev', icon: 'i-lucide-bot' },
  { value: 'human', label: 'You', icon: 'i-lucide-user' },
  { value: 'client', label: 'Client', icon: 'i-lucide-users' },
]

const createAssignee = ref('pi')

function openCreate(type?: string, parentId?: string) {
  createType.value = type || 'generate'
  createParentId.value = parentId
  createTitle.value = ''
  createAssignee.value = type === 'review' ? 'human' : 'pi'
  showCreate.value = true
}

async function handleCreate() {
  if (!createTitle.value.trim() || !teamId.value) return
  createPending.value = true
  try {
    await $fetch(`/api/teams/${teamId.value}/thinkgraph-workitems`, {
      method: 'POST',
      body: {
        projectId: projectId.value,
        title: createTitle.value.trim(),
        type: createType.value,
        status: 'queued',
        assignee: createAssignee.value,
        skill: ['discover', 'architect', 'generate', 'compose'].includes(createType.value)
          ? createType.value
          : undefined,
        ...(createParentId.value ? { parentId: createParentId.value } : {}),
      },
    })
    showCreate.value = false
    await refreshItems()
  }
  finally {
    createPending.value = false
  }
}

// ─── Update work item ───
async function updateItem(id: string, data: Partial<ThinkgraphWorkItem>) {
  if (!teamId.value) return
  await $fetch(`/api/teams/${teamId.value}/thinkgraph-workitems/${id}`, {
    method: 'PATCH',
    body: data,
  })
  await refreshItems()
}

async function deleteItem(id: string) {
  if (!teamId.value) return
  const children = items.value.filter(n => n.parentId === id)
  if (children.length > 0) {
    toast.add({ title: 'Cannot delete — has children. Delete children first.', color: 'warning' })
    return
  }
  try {
    await $fetch(`/api/teams/${teamId.value}/thinkgraph-workitems/${id}`, {
      method: 'DELETE',
    })
    if (selectedItemId.value === id) closeDetail()
    await refreshItems()
  } catch (err: any) {
    toast.add({ title: 'Delete failed', description: err.message, color: 'error' })
  }
}

async function onNodeDelete(nodeIds: string[]) {
  if (!teamId.value) return
  const deleteSet = new Set(nodeIds)

  // Sort: deepest nodes first so children are deleted before parents
  const sorted = [...nodeIds].sort((a, b) => {
    const depthA = items.value.find(n => n.id === a)?.depth ?? 0
    const depthB = items.value.find(n => n.id === b)?.depth ?? 0
    return depthB - depthA
  })

  for (const id of sorted) {
    // Check if remaining children exist (not counting ones we're also deleting)
    const remainingChildren = items.value.filter(n => n.parentId === id && !deleteSet.has(n.id))
    if (remainingChildren.length > 0) {
      toast.add({ title: `Cannot delete "${items.value.find(n => n.id === id)?.title}" — has children outside selection`, color: 'warning' })
      continue
    }
    try {
      await $fetch(`/api/teams/${teamId.value}/thinkgraph-workitems/${id}`, {
        method: 'DELETE',
      })
    } catch { /* skip failed deletes */ }
  }
  await refreshItems()
}

// ─── Quick create on drag-to-empty ───
const showQuickCreate = ref(false)
const quickCreatePos = ref({ x: 0, y: 0 })
const quickCreateParentId = ref<string | undefined>()

function onConnectEnd(event: { sourceNodeId: string; position: { x: number; y: number }; mouseEvent: MouseEvent }) {
  quickCreateParentId.value = event.sourceNodeId
  quickCreatePos.value = { x: event.mouseEvent.clientX, y: event.mouseEvent.clientY }
  showQuickCreate.value = true
}

async function handleQuickCreate(type: string) {
  if (!teamId.value || !quickCreateParentId.value) return
  showQuickCreate.value = false
  try {
    await $fetch(`/api/teams/${teamId.value}/thinkgraph-workitems`, {
      method: 'POST',
      body: {
        projectId: projectId.value,
        title: `New ${type}`,
        type,
        status: 'queued',
        assignee: type === 'review' ? 'human' : 'pi',
        skill: ['discover', 'architect', 'generate', 'compose'].includes(type) ? type : undefined,
        parentId: quickCreateParentId.value,
      },
    })
    await refreshItems()
  } catch (err: any) {
    toast.add({ title: 'Failed to create', description: err.message, color: 'error' })
  }
}

// Close quick create on click anywhere
if (import.meta.client) {
  useEventListener(document, 'click', () => {
    if (showQuickCreate.value) showQuickCreate.value = false
  })
}

// ─── Dispatch ───
// ─── Share link ───
const shareLoading = ref(false)

async function generateShareLink() {
  if (!project.value || !teamId.value) return
  shareLoading.value = true
  try {
    let token = project.value.shareToken
    if (!token) {
      // Generate a new share token
      token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      await $fetch(`/api/teams/${teamId.value}/thinkgraph-projects/${projectId.value}`, {
        method: 'PATCH',
        body: { shareToken: token },
      })
      await refreshProject()
    }
    const url = `${window.location.origin}/project/${token}`
    await navigator.clipboard.writeText(url)
    toast.add({ title: 'Share link copied!', description: url, color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Failed to generate share link', description: err.message, color: 'error' })
  } finally {
    shareLoading.value = false
  }
}

// ─── Dispatch ───
const { dispatch: dispatchWork, dispatching } = useWorkDispatch()

async function openDispatch(id: string) {
  const item = items.value.find(n => n.id === id)
  if (!item) return
  await dispatchWork(item)
  // Open terminal to watch the session
  terminalNodeId.value = id
  showTerminal.value = true
  await refreshItems()
}

// ─── Terminal panel ───
const showTerminal = ref(false)
const terminalNodeId = ref<string | null>(null)

function openTerminal(id: string) {
  terminalNodeId.value = id
  showTerminal.value = true
}

// Provide actions to WorkItemsNode
provide('projectItems', items)
provide('projectActions', {
  openDetail: (id: string) => {
    selectedItemId.value = id
    showDetail.value = true
  },
  addChild: (parentId: string) => {
    openCreate(undefined, parentId)
  },
  dispatch: openDispatch,
  openTerminal,
})

// ─── Status summary ───
const statusSummary = computed(() => {
  const counts: Record<string, number> = {}
  for (const n of items.value) {
    counts[n.status] = (counts[n.status] || 0) + 1
  }
  return counts
})

const STATUS_PILL: Record<string, string> = {
  queued: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  active: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  waiting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

// ─── List view config ───
const STATUS_CONFIG_LIST: Record<string, { icon: string; class: string }> = {
  queued: { icon: 'i-lucide-circle-dashed', class: 'text-neutral-400' },
  active: { icon: 'i-lucide-loader-2', class: 'text-primary-500 animate-spin' },
  waiting: { icon: 'i-lucide-pause-circle', class: 'text-amber-500' },
  done: { icon: 'i-lucide-check-circle', class: 'text-green-500' },
  blocked: { icon: 'i-lucide-alert-circle', class: 'text-red-500' },
}

const TYPE_BADGE: Record<string, string> = {
  discover: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  architect: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  generate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  compose: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  review: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  deploy: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

// ─── Kanban config ───
const kanbanColumns = [
  { value: 'queued', label: 'Queued', color: 'neutral', icon: 'i-lucide-circle-dashed' },
  { value: 'active', label: 'Active', color: 'primary', icon: 'i-lucide-loader-2' },
  { value: 'waiting', label: 'Waiting', color: 'warning', icon: 'i-lucide-pause-circle' },
  { value: 'done', label: 'Done', color: 'success', icon: 'i-lucide-check-circle' },
  { value: 'blocked', label: 'Blocked', color: 'error', icon: 'i-lucide-alert-circle' },
]

async function onKanbanMove(payload: { id: string; newValue: string | null; newOrder: number }) {
  if (!payload.newValue) return
  await updateItem(payload.id, { status: payload.newValue })
}

function onKanbanSelect(item: any) {
  selectedItemId.value = item.id
  showDetail.value = true
}

// ─── New item dropdown ───
const newItemOptions = computed(() => [
  WORK_TYPES.map(t => ({
    label: t.label,
    icon: t.icon,
    onSelect: () => openCreate(t.value),
  })),
])

// ─── View mode ───
const viewMode = ref<'canvas' | 'list' | 'kanban'>('canvas')
const showAssistant = ref(false)

// ─── Filtered/sorted items for list view ───
const STATUS_ORDER: Record<string, number> = { active: 0, waiting: 1, blocked: 2, queued: 3, done: 4 }

const listItems = computed(() => {
  return [...items.value].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 5
    const sb = STATUS_ORDER[b.status] ?? 5
    if (sa !== sb) return sa - sb
    return (a.order ?? 0) - (b.order ?? 0)
  })
})

const listFilter = ref<string | null>(null)

const filteredListItems = computed(() => {
  if (!listFilter.value) return listItems.value
  return listItems.value.filter(i => i.status === listFilter.value)
})

// ─── Bulk actions ───
const selectedIds = ref<Set<string>>(new Set())

function toggleSelect(id: string) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
  selectedIds.value = new Set(selectedIds.value) // trigger reactivity
}

function selectAll() {
  if (selectedIds.value.size === filteredListItems.value.length) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(filteredListItems.value.map(i => i.id))
  }
}

async function bulkUpdateStatus(status: string) {
  if (!teamId.value || selectedIds.value.size === 0) return
  const promises = [...selectedIds.value].map(id =>
    $fetch(`/api/teams/${teamId.value}/thinkgraph-workitems/${id}`, {
      method: 'PATCH',
      body: { status },
    }),
  )
  await Promise.all(promises)
  selectedIds.value = new Set()
  await refreshItems()
}

async function bulkDelete() {
  if (!teamId.value || selectedIds.value.size === 0) return
  const ids = [...selectedIds.value]
  const hasChildren = ids.some(id => items.value.some(i => i.parentId === id))
  if (hasChildren) {
    toast.add({ title: 'Cannot delete items with children', color: 'warning' })
    return
  }
  const promises = ids.map(id =>
    $fetch(`/api/teams/${teamId.value}/thinkgraph-workitems/${id}`, { method: 'DELETE' }),
  )
  await Promise.all(promises)
  selectedIds.value = new Set()
  await refreshItems()
}

async function promoteToTask(id: string, type: string) {
  const item = items.value.find(i => i.id === id)
  if (!item || !teamId.value) return
  await updateItem(id, { type, assignee: 'pi', status: 'queued' })
}

// ─── Flow ref for programmatic control ───
const flowRef = ref<any>(null)

// ─── Assistant actions ───
async function assistantCreateItem(data: { title: string; type: string; brief: string }) {
  if (!teamId.value) return
  try {
    await $fetch(`/api/teams/${teamId.value}/thinkgraph-workitems`, {
      method: 'POST',
      body: {
        projectId: projectId.value,
        title: data.title,
        type: data.type,
        status: 'queued',
        assignee: 'pi',
        brief: data.brief,
        skill: ['discover', 'architect', 'generate', 'compose'].includes(data.type) ? data.type : undefined,
      },
    })
    toast.add({ title: 'Work item created', description: data.title, color: 'success' })
    await refreshItems()
  } catch (err: any) {
    toast.add({ title: 'Failed to create', description: err.message, color: 'error' })
  }
}

function assistantFocusNode(nodeId: string) {
  // Switch to canvas view and select the node
  viewMode.value = 'canvas'
  selectedItemId.value = nodeId
  showDetail.value = true
  // TODO: programmatic zoom-to-node when CroutonFlow exposes fitView/setCenter
}

async function assistantRefresh() {
  // Reload items (may have been created/updated/deleted by assistant)
  await refreshItems()

  // Reload flow positions (may have been rearranged by assistant)
  if (flowId.value && teamId.value) {
    try {
      const flow = await $fetch<any>(`/api/crouton-flow/teams/${teamId.value}/flows/${flowId.value}`)
      if (flow?.nodePositions) {
        savedPositions.value = { ...flow.nodePositions }
      }
    } catch { /* ignore */ }
  }
}

// ─── Keyboard shortcuts ───
function handleKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  switch (e.key) {
    case 'n': case 'N': showCreate.value = true; break
    case 'Backspace': case 'Delete':
      if (selectedItemId.value && !showCreate.value) {
        e.preventDefault()
        deleteItem(selectedItemId.value)
      }
      break
    case 'd': case 'D':
      if (selectedItemId.value) updateItem(selectedItemId.value, { status: 'done' })
      break
    case 't': case 'T':
      if (selectedItemId.value) openTerminal(selectedItemId.value)
      break
    case 'v': case 'V':
      viewMode.value = viewMode.value === 'canvas' ? 'kanban' : viewMode.value === 'kanban' ? 'list' : 'canvas'
      break
    case 'a': case 'A':
      showAssistant.value = !showAssistant.value
      break
    case 'Escape':
      if (showDetail.value) closeDetail()
      else if (showCreate.value) showCreate.value = false
      break
  }
}
if (import.meta.client) {
  useEventListener(document, 'keydown', handleKeydown)
}
</script>

<template>
  <div class="h-full w-full flex flex-col flex-1 min-w-0">
    <!-- Top bar -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-default bg-default/80 backdrop-blur-sm shrink-0">
      <div class="flex items-center gap-3">
        <NuxtLink :to="`/admin/${teamId}/projects`" class="text-muted hover:text-default transition-colors">
          <UIcon name="i-lucide-arrow-left" class="size-4" />
        </NuxtLink>
        <div>
          <h1 class="text-sm font-semibold">{{ project?.name || 'Project' }}</h1>
          <p v-if="project?.clientName" class="text-xs text-muted">{{ project.clientName }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Status summary pills -->
        <div class="flex items-center gap-1 mr-2">
          <span
            v-for="(count, status) in statusSummary"
            :key="status"
            class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            :class="STATUS_PILL[status as string] || STATUS_PILL.queued"
          >
            {{ count }} {{ status }}
          </span>
        </div>

        <!-- View toggle -->
        <div class="flex items-center border border-default rounded-lg overflow-hidden mr-1">
          <button
            class="px-2 py-1 text-xs transition-colors"
            :class="viewMode === 'canvas' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'text-muted hover:text-default'"
            @click="viewMode = 'canvas'"
          >
            <UIcon name="i-lucide-git-branch" class="size-3.5" />
          </button>
          <button
            class="px-2 py-1 text-xs transition-colors"
            :class="viewMode === 'kanban' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'text-muted hover:text-default'"
            @click="viewMode = 'kanban'"
          >
            <UIcon name="i-lucide-columns-3" class="size-3.5" />
          </button>
          <button
            class="px-2 py-1 text-xs transition-colors"
            :class="viewMode === 'list' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'text-muted hover:text-default'"
            @click="viewMode = 'list'"
          >
            <UIcon name="i-lucide-list" class="size-3.5" />
          </button>
        </div>

        <UButton
          icon="i-lucide-sparkles"
          size="sm"
          :variant="showAssistant ? 'solid' : 'soft'"
          :color="showAssistant ? 'primary' : 'neutral'"
          @click="showAssistant = !showAssistant"
        />

        <UButton
          icon="i-lucide-share-2"
          size="sm"
          label="Share"
          variant="soft"
          color="neutral"
          :loading="shareLoading"
          @click="generateShareLink"
        />
        <UDropdownMenu :items="newItemOptions">
          <UButton icon="i-lucide-plus" size="sm" label="New" variant="soft" />
        </UDropdownMenu>
      </div>
    </div>

    <!-- Main content area: view + assistant side by side -->
    <div class="flex-1 flex min-h-0">
      <!-- Canvas view -->
      <div v-if="viewMode === 'canvas'" class="flex-1 relative">
        <div v-if="itemsLoading && !items.length" class="absolute inset-0 flex items-center justify-center">
          <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
        </div>

        <div v-else-if="!items.length" class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <div class="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <UIcon name="i-lucide-git-branch" class="size-8 text-muted" />
            </div>
            <h3 class="text-lg font-semibold mb-2">Empty canvas</h3>
            <p class="text-sm text-muted mb-4">Start by adding your first work item.</p>
            <UDropdownMenu :items="newItemOptions">
              <UButton icon="i-lucide-plus" label="Add work item" />
            </UDropdownMenu>
          </div>
        </div>

        <CroutonFlow
          v-else
          :key="flowKey"
          ref="flowRef"
          :rows="items"
          collection="workItems"
          parent-field="parentId"
          label-field="title"
          :flow-id="flowId || undefined"
          :saved-positions="savedPositions || undefined"
          minimap
          @node-click="onNodeClick"
          @connect-end="onConnectEnd"
          @node-delete="onNodeDelete"
        />

        <!-- Quick create menu (appears on drag-to-empty) -->
        <div
          v-if="showQuickCreate"
          class="fixed z-50 bg-default border border-default rounded-lg shadow-lg p-2 min-w-[160px]"
          :style="{ left: quickCreatePos.x + 'px', top: quickCreatePos.y + 'px' }"
        >
          <p class="text-xs text-muted px-2 py-1 mb-1">Add connected node</p>
          <button
            v-for="t in WORK_TYPES"
            :key="t.value"
            class="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted/50 cursor-pointer"
            @click="handleQuickCreate(t.value)"
          >
            <UIcon :name="t.icon" class="size-4" />
            {{ t.label }}
          </button>
        </div>
      </div>

      <!-- Kanban view -->
      <div v-else-if="viewMode === 'kanban'" class="flex-1 overflow-hidden">
        <CroutonKanban
          :rows="items"
          collection="thinkgraphWorkItems"
          group-field="status"
          :columns="kanbanColumns"
          :show-counts="true"
          @move="onKanbanMove"
          @select="onKanbanSelect"
        />
      </div>

      <!-- List / triage view -->
      <div v-else class="flex-1 overflow-y-auto">
        <!-- Filter bar + bulk actions -->
        <div class="sticky top-0 z-10 bg-default/80 backdrop-blur-sm border-b border-default px-4 py-2 flex items-center gap-2">
          <button
            v-for="s in [null, 'active', 'waiting', 'queued', 'blocked', 'done']"
            :key="s || 'all'"
            class="text-xs px-2 py-1 rounded-full transition-colors"
            :class="listFilter === s
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
              : 'text-muted hover:text-default hover:bg-muted/50'"
            @click="listFilter = s"
          >
            {{ s || 'all' }}
            <span class="ml-0.5 opacity-60">{{ s ? items.filter(i => i.status === s).length : items.length }}</span>
          </button>

          <div v-if="selectedIds.size > 0" class="ml-auto flex items-center gap-1">
            <span class="text-xs text-muted mr-1">{{ selectedIds.size }} selected</span>
            <UButton size="xs" variant="soft" color="warning" icon="i-lucide-rotate-ccw" label="Reset" @click="bulkUpdateStatus('queued')" />
            <UButton size="xs" variant="soft" color="green" icon="i-lucide-check" label="Done" @click="bulkUpdateStatus('done')" />
            <UButton size="xs" variant="soft" color="red" icon="i-lucide-trash-2" label="Delete" @click="bulkDelete" />
          </div>
        </div>

        <!-- Items list -->
        <div class="divide-y divide-default">
          <div
            v-for="item in filteredListItems"
            :key="item.id"
            class="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
            @click="onNodeClick(item.id)"
          >
            <input
              type="checkbox"
              :checked="selectedIds.has(item.id)"
              class="mt-1 rounded border-neutral-300 dark:border-neutral-600"
              @click.stop="toggleSelect(item.id)"
            >
            <UIcon
              :name="STATUS_CONFIG_LIST[item.status]?.icon || 'i-lucide-circle-dashed'"
              class="size-4 mt-0.5 shrink-0"
              :class="STATUS_CONFIG_LIST[item.status]?.class || 'text-neutral-400'"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full" :class="TYPE_BADGE[item.type] || 'bg-neutral-100 text-neutral-600'">
                  {{ item.type }}
                </span>
                <span class="text-sm font-medium truncate">{{ item.title }}</span>
              </div>
              <p v-if="item.brief" class="text-xs text-muted mt-0.5 line-clamp-1">{{ item.brief }}</p>
            </div>
            <span class="text-[10px] text-muted shrink-0 mt-1">{{ item.assignee || 'pi' }}</span>
            <UDropdownMenu
              v-if="item.type === 'review' && item.assignee === 'human'"
              :items="[[
                { label: 'Promote to Architect', icon: 'i-lucide-pencil-ruler', onSelect: () => promoteToTask(item.id, 'architect') },
                { label: 'Promote to Generate', icon: 'i-lucide-hammer', onSelect: () => promoteToTask(item.id, 'generate') },
                { label: 'Promote to Compose', icon: 'i-lucide-layout', onSelect: () => promoteToTask(item.id, 'compose') },
              ]]"
            >
              <UButton icon="i-lucide-arrow-up-right" size="xs" variant="ghost" color="neutral" title="Promote to task" @click.stop />
            </UDropdownMenu>
          </div>
        </div>
        <div v-if="!filteredListItems.length" class="py-12 text-center text-sm text-muted">
          No items{{ listFilter ? ` with status "${listFilter}"` : '' }}
        </div>
      </div>

      <!-- Assistant panel (works in both views) -->
      <ProjectAssistant
        v-if="showAssistant"
        :project-id="projectId"
        :project-name="project?.name"
        :flow-id="flowId"
        :focused-node-id="selectedItemId"
        :focused-node-title="selectedItem?.title"
        class="w-[360px] shrink-0"
        @close="showAssistant = false"
        @create-item="assistantCreateItem"
        @focus-node="assistantFocusNode"
        @refresh="assistantRefresh"
      />
    </div>

    <!-- Detail panel (slideover) -->
    <USlideover v-if="showDetail && selectedItem" v-model:open="showDetail" side="right" :ui="{ width: 'max-w-md' }">
      <template #content>
        <div class="p-6 h-full overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold">{{ selectedItem.title }}</h2>
            <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm" @click="closeDetail" />
          </div>

          <!-- Type & Status -->
          <div class="grid grid-cols-2 gap-3 mb-6">
            <UFormField label="Type">
              <USelectMenu
                :model-value="selectedItem.type"
                :items="WORK_TYPES.map(t => t.value)"
                class="w-full"
                @update:model-value="(v: string) => updateItem(selectedItem!.id, { type: v })"
              />
            </UFormField>
            <UFormField label="Status">
              <USelectMenu
                :model-value="selectedItem.status"
                :items="['queued', 'active', 'waiting', 'done', 'blocked']"
                class="w-full"
                @update:model-value="(v: string) => updateItem(selectedItem!.id, { status: v })"
              />
            </UFormField>
          </div>

          <!-- Assignee -->
          <UFormField label="Assignee" class="mb-4">
            <USelectMenu
              :model-value="selectedItem.assignee || 'pi'"
              :items="ASSIGNEES.map(a => a.value)"
              class="w-full"
              @update:model-value="(v: string) => updateItem(selectedItem!.id, { assignee: v })"
            />
          </UFormField>

          <!-- Brief -->
          <UFormField label="Brief" class="mb-4">
            <UTextarea
              :model-value="selectedItem.brief || ''"
              placeholder="What needs to happen?"
              :rows="4"
              class="w-full"
              @blur="(e: FocusEvent) => updateItem(selectedItem!.id, { brief: (e.target as HTMLTextAreaElement).value })"
            />
          </UFormField>

          <!-- Output -->
          <UFormField label="Output" class="mb-4">
            <UTextarea
              :model-value="selectedItem.output || ''"
              placeholder="Result will appear here..."
              :rows="4"
              class="w-full"
              @blur="(e: FocusEvent) => updateItem(selectedItem!.id, { output: (e.target as HTMLTextAreaElement).value })"
            />
          </UFormField>

          <!-- Retrospective -->
          <UFormField v-if="selectedItem.retrospective" label="Retrospective" class="mb-4">
            <div class="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
              <div class="flex items-center gap-1.5 mb-2">
                <UIcon name="i-lucide-lightbulb" class="size-4 text-amber-500" />
                <span class="text-xs font-medium text-amber-700 dark:text-amber-400">Agent Lessons</span>
              </div>
              <p class="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{{ selectedItem.retrospective }}</p>
            </div>
          </UFormField>

          <!-- Metadata -->
          <div class="space-y-3 mb-6">
            <UFormField label="Skill">
              <UInput
                :model-value="selectedItem.skill || ''"
                placeholder="e.g. architect"
                class="w-full"
                @blur="(e: FocusEvent) => updateItem(selectedItem!.id, { skill: (e.target as HTMLInputElement).value })"
              />
            </UFormField>
            <UFormField label="Worktree">
              <UInput
                :model-value="selectedItem.worktree || ''"
                placeholder="e.g. feat/blog-collection"
                class="w-full"
                @blur="(e: FocusEvent) => updateItem(selectedItem!.id, { worktree: (e.target as HTMLInputElement).value })"
              />
            </UFormField>
            <UFormField label="Preview URL">
              <UInput
                :model-value="selectedItem.deployUrl || ''"
                placeholder="https://..."
                class="w-full"
                @blur="(e: FocusEvent) => updateItem(selectedItem!.id, { deployUrl: (e.target as HTMLInputElement).value })"
              />
            </UFormField>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap gap-2 pt-4 border-t border-default">
            <UButton
              v-if="selectedItem.status === 'queued' || selectedItem.status === 'blocked'"
              icon="i-lucide-send"
              label="Dispatch"
              :loading="dispatching"
              @click="openDispatch(selectedItem.id)"
            />
            <UButton
              v-if="selectedItem.status === 'active'"
              icon="i-lucide-rotate-ccw"
              label="Reset to Queued"
              variant="soft"
              color="warning"
              @click="updateItem(selectedItem.id, { status: 'queued' })"
            />
            <UButton
              v-if="selectedItem.status !== 'done'"
              icon="i-lucide-check"
              label="Mark Done"
              variant="soft"
              color="green"
              @click="updateItem(selectedItem.id, { status: 'done' })"
            />
            <UButton
              icon="i-lucide-trash-2"
              variant="soft"
              color="red"
              class="ml-auto"
              @click="deleteItem(selectedItem.id)"
            />
          </div>
        </div>
      </template>
    </USlideover>

    <!-- Create modal -->
    <UModal v-model:open="showCreate">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">New Work Item</h3>
          <div class="flex flex-col gap-4">
            <UFormField label="Title" required>
              <UInput v-model="createTitle" placeholder="e.g. Design blog collection schema" class="w-full" />
            </UFormField>
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Type">
                <USelectMenu
                  v-model="createType"
                  :items="WORK_TYPES.map(t => t.value)"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Assignee">
                <USelectMenu
                  v-model="createAssignee"
                  :items="ASSIGNEES.map(a => a.value)"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
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

    <!-- Terminal panel -->
    <TerminalPanel
      v-if="terminalNodeId"
      :node-id="terminalNodeId"
      :team-id="teamId"
      :open="showTerminal"
      @update:open="(v) => { showTerminal = v; if (!v) terminalNodeId = null }"
    />
  </div>
</template>
