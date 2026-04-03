<script setup lang="ts">
import type { ThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/types'
import ThinkgraphNodesNodeComponent from '~/components/ThinkgraphNodesNode.vue'

// Explicitly register so CroutonFlow's resolveComponent() can find it
// CroutonFlow: "thinkgraphNodes" → PascalCase "ThinkgraphNodes" + "Node" → "ThinkgraphNodesNode"
const app = useNuxtApp().vueApp
if (!app.component('ThinkgraphNodesNode')) {
  app.component('ThinkgraphNodesNode', ThinkgraphNodesNodeComponent)
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
      query: { collection: 'thinkgraphNodes', name: flowName },
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
        collection: 'thinkgraphNodes',
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
const items = ref<ThinkgraphNode[]>([])
const itemsLoading = ref(false)

// ─── Additional edges (fan-in contextNodeIds) ───
const additionalEdges = computed(() => {
  const edges: Array<{ id: string; source: string; target: string }> = []
  for (const d of items.value) {
    if (Array.isArray(d.contextNodeIds)) {
      for (const srcId of d.contextNodeIds) {
        if (srcId !== d.parentId) {
          edges.push({ id: `e-ctx-${srcId}-${d.id}`, source: srcId, target: d.id })
        }
      }
    }
  }
  return edges
})

async function refreshItems() {
  if (!projectId.value || !teamId.value) {
    items.value = []
    return
  }
  itemsLoading.value = true
  try {
    const result = await $fetch<ThinkgraphNode[]>(
      `/api/teams/${teamId.value}/thinkgraph-nodes`,
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
  if (collection === 'thinkgraphNodes') refreshItems()
})
nuxtApp.hook('crouton:remoteChange' as any, ({ collection }: any) => {
  if (collection === 'thinkgraphNodes') refreshItems()
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

// Canvas multi-select (for SelectionBar synthesis/brief actions)
const canvasSelectedIds = ref<string[]>([])

function onSelectionChange(ids: string[]) {
  canvasSelectedIds.value = ids
}

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
const createBrief = ref('')
const createParentId = ref<string | undefined>()
const createPending = ref(false)

const NODE_TEMPLATES = [
  { value: 'idea', label: 'Idea', icon: 'i-lucide-lightbulb' },
  { value: 'research', label: 'Research', icon: 'i-lucide-search' },
  { value: 'task', label: 'Task', icon: 'i-lucide-hammer' },
  { value: 'feature', label: 'Feature', icon: 'i-lucide-rocket' },
  { value: 'meta', label: 'Meta', icon: 'i-lucide-brain-circuit' },
]

const TEMPLATE_STEPS: Record<string, string[]> = {
  idea: [],
  research: ['analyse'],
  task: ['analyst', 'builder', 'reviewer', 'merger'],
  feature: ['analyst', 'builder', 'launcher', 'reviewer', 'merger'],
  meta: ['analyst', 'builder', 'reviewer', 'merger'],
}

const ASSIGNEES = [
  { value: 'pi', label: 'Pi.dev', icon: 'i-lucide-bot' },
  { value: 'human', label: 'You', icon: 'i-lucide-user' },
  { value: 'client', label: 'Client', icon: 'i-lucide-users' },
  { value: 'ci', label: 'CI', icon: 'i-lucide-git-branch' },
]

function openCreate(_template?: string, parentId?: string) {
  createParentId.value = parentId
  createTitle.value = ''
  createBrief.value = ''
  showCreate.value = true
}

async function handleCreate() {
  if (!createTitle.value.trim() || !teamId.value) return
  createPending.value = true
  try {
    const created = await $fetch<{ id: string }>(`/api/teams/${teamId.value}/thinkgraph-nodes`, {
      method: 'POST',
      body: {
        projectId: projectId.value,
        title: createTitle.value.trim(),
        brief: createBrief.value.trim() || undefined,
        origin: 'human',
        ...(createParentId.value ? { parentId: createParentId.value } : {}),
      },
    })
    showCreate.value = false
    await refreshItems()

    if (created?.id) {
      // Select the new node — detail opens once selectedItem resolves
      selectedItemId.value = created.id
      showDetail.value = true

      // Classify in background — just sets the right template, no auto-actions
      const content = [createTitle.value.trim(), createBrief.value.trim()].filter(Boolean).join(' ')
      if (content.length >= 50) {
        $fetch(`/api/teams/${teamId.value}/thinkgraph-nodes/${created.id}/classify`, {
          method: 'POST',
        }).then(() => refreshItems()).catch((err: any) => {
          console.error('Auto-classify failed:', err)
        })
      }
    }
  }
  finally {
    createPending.value = false
  }
}

// ─── Update work item ───
async function updateItem(id: string, data: Partial<ThinkgraphNode>) {
  if (!teamId.value) return
  await $fetch(`/api/teams/${teamId.value}/thinkgraph-nodes/${id}`, {
    method: 'PATCH',
    body: data,
  })
  await refreshItems()
}

const deletingId = ref<string | null>(null)

async function deleteNode(id: string) {
  const item = items.value.find(n => n.id === id)
  if (!item) return
  const children = items.value.filter(n => n.parentId === id)
  if (children.length > 0) {
    toast.add({ title: 'Cannot delete — has children. Delete children first.', color: 'warning' })
    return
  }
  if (!teamId.value) return
  deletingId.value = id
  try {
    await $fetch(`/api/teams/${teamId.value}/thinkgraph-nodes/${id}`, {
      method: 'DELETE',
    })
    if (selectedItemId.value === id) closeDetail()
    await refreshItems()
  } catch (err: any) {
    toast.add({ title: 'Delete failed', description: err.message, color: 'error' })
  }
  deletingId.value = null
}

async function onNodeDelete(nodeIds: string[]) {
  // Single node: select it and open detail panel (user can delete from there)
  if (nodeIds.length === 1) {
    selectedItemId.value = nodeIds[0]
    showDetail.value = true
    await refreshItems() // Restore the node that Vue Flow visually removed
    return
  }
  // Multi-node: confirm first
  if (!teamId.value || !confirm(`Delete ${nodeIds.length} items?`)) return
  const deleteSet = new Set(nodeIds)

  const sorted = [...nodeIds].sort((a, b) => {
    const depthA = items.value.find(n => n.id === a)?.depth ?? 0
    const depthB = items.value.find(n => n.id === b)?.depth ?? 0
    return depthB - depthA
  })

  for (const id of sorted) {
    const remainingChildren = items.value.filter(n => n.parentId === id && !deleteSet.has(n.id))
    if (remainingChildren.length > 0) {
      toast.add({ title: `Cannot delete "${items.value.find(n => n.id === id)?.title}" — has children outside selection`, color: 'warning' })
      continue
    }
    try {
      await $fetch(`/api/teams/${teamId.value}/thinkgraph-nodes/${id}`, {
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

async function handleQuickCreate(template: string) {
  if (!teamId.value || !quickCreateParentId.value) return
  showQuickCreate.value = false
  const steps = TEMPLATE_STEPS[template] || []
  try {
    await $fetch(`/api/teams/${teamId.value}/thinkgraph-nodes`, {
      method: 'POST',
      body: {
        projectId: projectId.value,
        title: `New ${template}`,
        template,
        steps,
        status: steps.length > 0 ? 'queued' : 'idle',
        assignee: 'pi',
        parentId: quickCreateParentId.value,
      },
    })
    await refreshItems()
  } catch (err: any) {
    toast.add({ title: 'Failed to create', description: err.message, color: 'error' })
  }
}

// Close quick create on click anywhere (but not the click from the connection drag release)
const quickCreateOpenedAt = ref(0)
watch(showQuickCreate, (v) => { if (v) quickCreateOpenedAt.value = Date.now() })
if (import.meta.client) {
  useEventListener(document, 'click', () => {
    if (showQuickCreate.value && Date.now() - quickCreateOpenedAt.value > 100) {
      showQuickCreate.value = false
    }
  })
}

// ─── Canvas multi-select actions ───
async function canvasSynthesize() {
  if (canvasSelectedIds.value.length < 2 || !teamId.value) return
  const nodeIds = canvasSelectedIds.value
  const titles = nodeIds
    .map(id => items.value.find(n => n.id === id)?.title)
    .filter(Boolean)

  try {
    const steps = ['synthesize']
    const node = await $fetch<any>(`/api/teams/${teamId.value}/thinkgraph-nodes`, {
      method: 'POST',
      body: {
        projectId: projectId.value,
        title: `Synthesis: ${titles.slice(0, 3).join(', ')}${titles.length > 3 ? '...' : ''}`,
        template: 'research',
        steps,
        status: 'queued',
        assignee: 'pi',
        origin: 'human',
        contextScope: 'manual',
        contextNodeIds: nodeIds,
        parentId: nodeIds[0],
      },
    })
    canvasSelectedIds.value = []
    await refreshItems()

    // Auto-dispatch
    if (node?.id) {
      await $fetch(`/api/teams/${teamId.value}/dispatch/work-item`, {
        method: 'POST',
        body: { workItemId: node.id },
      })
      toast.add({ title: 'Synthesis created & dispatched', color: 'success' })
    }
  } catch (err: any) {
    toast.add({ title: 'Synthesis failed', description: err?.message, color: 'error' })
  }
}

async function canvasGenerateBrief(format: string) {
  if (canvasSelectedIds.value.length === 0 || !teamId.value) return
  try {
    const result = await $fetch<{ brief: string }>(`/api/teams/${teamId.value}/thinkgraph-nodes/brief`, {
      method: 'POST',
      body: { ids: canvasSelectedIds.value, format, graphId: projectId.value },
    })
    if (result?.brief) {
      await navigator.clipboard.writeText(result.brief)
      toast.add({ title: 'Brief copied to clipboard', color: 'success' })
    }
  } catch (err: any) {
    toast.add({ title: 'Brief failed', description: err?.message, color: 'error' })
  }
}

async function canvasCopyContext() {
  const texts = canvasSelectedIds.value
    .map(id => items.value.find(n => n.id === id))
    .filter(Boolean)
    .map(n => `## ${n!.title}\n${n!.brief || n!.output || ''}`)
  await navigator.clipboard.writeText(texts.join('\n\n'))
  toast.add({ title: 'Context copied', color: 'success' })
}

function canvasDeselect(id: string) {
  canvasSelectedIds.value = canvasSelectedIds.value.filter(i => i !== id)
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

// ─── Worker health ───
const { health: workerHealth, check: checkWorker } = useWorkerHealth()

// ─── Dispatch ───
const { dispatch: dispatchWork, dispatching } = useWorkDispatch()

async function openDispatch(id: string) {
  const item = items.value.find(n => n.id === id)
  if (!item) return
  await dispatchWork(item)
  await refreshItems()
}

async function dispatchNode(id: string) {
  if (!teamId.value) return
  // Ensure the node has steps and is queued before dispatching
  const item = items.value.find(n => n.id === id)
  if (!item) return
  const steps = Array.isArray(item.steps) && item.steps.length > 0
    ? item.steps
    : TEMPLATE_STEPS[item.template || 'task'] || ['analyst', 'builder', 'reviewer', 'merger']
  await updateItem(id, { status: 'queued', assignee: 'pi', steps })
  await openDispatch(id)
}

// ─── Decompose on demand ───
const decomposing = ref<string | null>(null)

async function decomposeNode(id: string) {
  if (!teamId.value || decomposing.value) return
  decomposing.value = id
  try {
    toast.add({ title: 'Breaking down...', icon: 'i-lucide-git-branch', color: 'info' })
    await $fetch(`/api/teams/${teamId.value}/thinkgraph-nodes/${id}/expand`, {
      method: 'POST',
      body: { mode: 'decompose', graphId: projectId.value },
    })
    toast.add({ title: 'Broken down into tasks', color: 'success' })
    await refreshItems()
  } catch (err: any) {
    console.error('Decompose failed:', err)
    toast.add({ title: 'Decompose failed', description: err?.message, color: 'error' })
  } finally {
    decomposing.value = null
  }
}

/** Render basic markdown to HTML */
function renderMd(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<p class="font-semibold text-sm mt-3 mb-1">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="font-bold text-base mt-4 mb-2">$1</p>')
    .replace(/^# (.+)$/gm, '<p class="font-bold text-lg mt-4 mb-2">$1</p>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="text-xs bg-white/10 px-1 py-0.5 rounded font-mono">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="underline" target="_blank">$1</a>')
    .replace(/^- (.+)$/gm, '<span class="block pl-3">• $1</span>')
    .replace(/\\n/g, '<br>')
    .replace(/\n/g, '<br>')
}

// ─── Orange response (re-dispatch with human answer) ───
const redispatching = ref(false)
const orangeAnswers = ref<Record<number, string>>({})
const orangeFreeform = ref('')

/** Read structured questions from the 'questions' artifact (set by webhook post-processing) */
interface StructuredQuestion {
  question: string
  options: { key: string; label: string }[]
}
const questionsArtifact = computed(() => {
  const artifacts = selectedItem.value?.artifacts
  if (!Array.isArray(artifacts)) return null
  return artifacts.find((a: any) => a?.type === 'questions') as { type: 'questions'; research: string; questions: StructuredQuestion[] } | undefined ?? null
})

const structuredQuestions = computed(() => questionsArtifact.value?.questions ?? [])
const researchContent = computed(() => questionsArtifact.value?.research ?? '')

/** Check if any answer has been filled in */
const hasAnyAnswer = computed(() => {
  return Object.values(orangeAnswers.value).some(a => a?.trim()) || orangeFreeform.value.trim()
})

/** Format Q&A pairs for the brief */
function formatAnswers(): string {
  const parts: string[] = []
  for (const [idx, answer] of Object.entries(orangeAnswers.value)) {
    if (!answer?.trim()) continue
    const q = structuredQuestions.value[Number(idx)]
    if (q) parts.push(`Q: ${q.question}\nA: ${answer.trim()}`)
  }
  if (orangeFreeform.value.trim()) {
    parts.push(`Additional context: ${orangeFreeform.value.trim()}`)
  }
  return parts.join('\n\n')
}

async function respondAndRedispatch(id: string) {
  const item = items.value.find(n => n.id === id)
  if (!item || !hasAnyAnswer.value || !teamId.value) return
  redispatching.value = true
  try {
    const formattedAnswers = formatAnswers()
    const updatedBrief = `${item.brief || item.title}\n\n---\n**Human answers:**\n${formattedAnswers}`
    await updateItem(id, {
      brief: updatedBrief,
      status: 'queued',
      assignee: 'pi',
      signal: null,
    })
    orangeAnswers.value = {}
    orangeFreeform.value = ''
    // Dispatch at current stage (re-run same stage with new context)
    const refreshed = items.value.find(n => n.id === id)
    if (refreshed) {
      await dispatchWork(refreshed)
    }
    await refreshItems()
  } finally {
    redispatching.value = false
  }
}

// ─── Unblock (analyst coach mode) ───
async function unblockItem(id: string) {
  const item = items.value.find(n => n.id === id)
  if (!item || !teamId.value) return
  redispatching.value = true
  try {
    await updateItem(id, {
      status: 'queued',
      assignee: 'pi',
      signal: null,
    })
    const refreshed = items.value.find(n => n.id === id)
    if (refreshed) {
      await dispatchWork(refreshed, {
        prompt: `COACH MODE: The analyst previously rejected this brief (signal red). The human wants help improving it. Your job is now to help write a better brief through questions.\n\nPrevious rejection reason:\n${item.output || '(none)'}\n\nDo NOT evaluate. Instead:\n1. Ask 3-5 specific questions that would clarify the brief enough for a builder\n2. Signal ORANGE with your questions\n3. When the human answers, rewrite the brief incorporating their answers and signal GREEN with the improved brief in the output field AND update the brief field with the rewritten version`,
      })
    }
    await refreshItems()
  } finally {
    redispatching.value = false
  }
}

// Reset answers when selecting a different item
watch(selectedItemId, () => {
  orangeAnswers.value = {}
  orangeFreeform.value = ''
})

// ─── Turn learning into actionable brief ───
async function turnIntoBrief(id: string) {
  const item = items.value.find(n => n.id === id)
  if (!item) return
  await updateItem(id, {
    template: 'task',
    steps: TEMPLATE_STEPS.task,
    assignee: 'pi',
    status: 'queued',
    brief: `${item.title}\n\n${item.brief || ''}\n\nRewrite this learning into a concrete implementation. Identify the target file(s), describe the specific change, and implement it.`,
  })
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

const TEMPLATE_BADGE: Record<string, string> = {
  idea: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  research: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  task: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  feature: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  meta: 'bg-rose-100 text-rose-700 dark:bg-rose-100/30 dark:text-rose-400',
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

// ─── New item button ───

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
    $fetch(`/api/teams/${teamId.value}/thinkgraph-nodes/${id}`, {
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
    $fetch(`/api/teams/${teamId.value}/thinkgraph-nodes/${id}`, { method: 'DELETE' }),
  )
  await Promise.all(promises)
  selectedIds.value = new Set()
  await refreshItems()
}

async function promoteToTask(id: string, template: string) {
  const item = items.value.find(i => i.id === id)
  if (!item || !teamId.value) return
  const steps = TEMPLATE_STEPS[template] || []
  await updateItem(id, { template, steps, assignee: 'pi', status: 'queued' })
}

// ─── Flow ref for programmatic control ───
const flowRef = ref<any>(null)

// ─── Assistant actions ───
async function assistantCreateItem(data: { title: string; type: string; brief: string }) {
  if (!teamId.value) return
  const template = data.type || 'task'
  const steps = TEMPLATE_STEPS[template] || []
  try {
    await $fetch(`/api/teams/${teamId.value}/thinkgraph-nodes`, {
      method: 'POST',
      body: {
        projectId: projectId.value,
        title: data.title,
        template,
        steps,
        status: 'idle',
        assignee: 'pi',
        brief: data.brief,
        origin: 'ai',
        ...(selectedItemId.value ? { parentId: selectedItemId.value } : {}),
      },
    })
    toast.add({ title: 'Node created', description: data.title, color: 'success' })
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

// ─── Stage output history (extracted from artifacts) ───
const STAGE_SIGNAL_ICON: Record<string, { icon: string; class: string }> = {
  green: { icon: 'i-lucide-check-circle', class: 'text-green-500' },
  orange: { icon: 'i-lucide-pause-circle', class: 'text-amber-500' },
  red: { icon: 'i-lucide-alert-circle', class: 'text-red-500' },
}

const STAGE_LABEL: Record<string, string> = {
  analyst: 'Analyst',
  builder: 'Builder',
  launcher: 'Launcher',
  reviewer: 'Reviewer',
  merger: 'Merger',
  analyse: 'Analyse',
  synthesize: 'Synthesize',
  optimizer: 'Optimizer',
}

const stageOutputs = computed(() => {
  if (!selectedItem.value?.artifacts) return []
  const artifacts = Array.isArray(selectedItem.value.artifacts) ? selectedItem.value.artifacts : []
  return artifacts
    .filter((a: any) => a.type === 'stage-output')
    .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
})

function formatStageOutput(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="text-[11px] bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" class="text-primary underline">$1</a>')
    .replace(/(^|\n)- /g, '$1• ')
    .replace(/\n/g, '<br>')
}

const stageAccordionItems = computed(() => {
  return stageOutputs.value.map((so: any) => {
    const time = so.timestamp ? new Date(so.timestamp).toLocaleTimeString() : ''
    return {
      label: `${STAGE_LABEL[so.stage] || so.stage} — ${so.signal || 'done'}${time ? ` (${time})` : ''}`,
      icon: STAGE_SIGNAL_ICON[so.signal]?.icon || 'i-lucide-circle',
      content: so.output ? formatStageOutput(so.output) : '(no output)',
      value: `${so.stage}-${so.timestamp}`,
    }
  })
})

// ─── Detail panel status bar ───
const DETAIL_PIPELINE_STAGES = ['analyst', 'builder', 'launcher', 'reviewer', 'merger'] as const
const DETAIL_STAGE_LABELS: Record<string, string> = { analyst: 'A', builder: 'B', launcher: 'L', reviewer: 'R', merger: 'M' }

const detailPipelineDots = computed(() => {
  const si = selectedItem.value
  if (!si?.stage) return DETAIL_PIPELINE_STAGES.map(s => ({ stage: s, label: DETAIL_STAGE_LABELS[s], state: 'pending' as const }))
  const currentIdx = DETAIL_PIPELINE_STAGES.indexOf(si.stage as any)
  const isWorking = si.status === 'active'
  return DETAIL_PIPELINE_STAGES.map((s, idx) => {
    if (idx < currentIdx) return { stage: s, label: DETAIL_STAGE_LABELS[s], state: 'done' as const }
    if (idx === currentIdx) {
      if (isWorking) return { stage: s, label: DETAIL_STAGE_LABELS[s], state: 'working' as const }
      if (si.signal === 'green') return { stage: s, label: DETAIL_STAGE_LABELS[s], state: 'green' as const }
      if (si.signal === 'orange') return { stage: s, label: DETAIL_STAGE_LABELS[s], state: 'orange' as const }
      if (si.signal === 'red') return { stage: s, label: DETAIL_STAGE_LABELS[s], state: 'red' as const }
      return { stage: s, label: DETAIL_STAGE_LABELS[s], state: 'current' as const }
    }
    return { stage: s, label: DETAIL_STAGE_LABELS[s], state: 'pending' as const }
  })
})

const detailTags = computed(() => {
  const si = selectedItem.value
  if (!si) return []
  const arts = Array.isArray(si.artifacts) ? si.artifacts : []
  const hasPR = arts.some((a: any) => a?.type === 'pr')
  const ciArt = arts.find((a: any) => a?.type === 'ci') as any
  const ciStatus = ciArt?.status || null
  const hasWorktree = !!si.worktree
  const isWaitingHuman = si.status === 'waiting' && si.assignee === 'human'
  const t: Array<{ emoji: string; title: string }> = []
  if (hasPR) t.push({ emoji: '🔀', title: 'Has PR' })
  if (hasWorktree) t.push({ emoji: '🔧', title: 'Worktree set' })
  if (ciStatus === 'pass') t.push({ emoji: '✅', title: 'CI passed' })
  if (ciStatus === 'fail') t.push({ emoji: '❌', title: 'CI failed' })
  if (isWaitingHuman) t.push({ emoji: '👀', title: 'Waiting for you' })
  return t
})

const DETAIL_TEMPLATE_CONFIG: Record<string, { icon: string; label: string; class: string }> = {
  idea: { icon: 'i-lucide-lightbulb', label: 'Idea', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  research: { icon: 'i-lucide-search', label: 'Research', class: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  task: { icon: 'i-lucide-hammer', label: 'Task', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  feature: { icon: 'i-lucide-rocket', label: 'Feature', class: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  meta: { icon: 'i-lucide-brain-circuit', label: 'Meta', class: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
}

const DETAIL_STATUS_CONFIG: Record<string, { icon: string; label: string; class: string }> = {
  queued: { icon: 'i-lucide-circle-dashed', label: 'Queued', class: 'text-neutral-400' },
  active: { icon: 'i-lucide-loader-2', label: 'Active', class: 'text-blue-500' },
  waiting: { icon: 'i-lucide-pause-circle', label: 'Waiting', class: 'text-amber-500' },
  done: { icon: 'i-lucide-check-circle', label: 'Done', class: 'text-green-500' },
  blocked: { icon: 'i-lucide-alert-circle', label: 'Blocked', class: 'text-red-500' },
}

// ─── Keyboard shortcuts ───
function handleKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  switch (e.key) {
    case 'n': case 'N': showCreate.value = true; break
    case 'Backspace': case 'Delete':
      if (selectedItemId.value && !showCreate.value) {
        e.preventDefault()
        deleteNode(selectedItemId.value)
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
        <!-- Worker status indicator -->
        <button
          class="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full transition-colors mr-1"
          :class="workerHealth.online
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'"
          :title="workerHealth.online
            ? `Worker v${workerHealth.version} — ${workerHealth.activeSessions}/${workerHealth.maxSessions} sessions — up ${Math.round((workerHealth.uptime || 0) / 60)}m`
            : `Worker offline: ${workerHealth.error || 'unreachable'}`"
          @click="checkWorker"
        >
          <span
            class="size-1.5 rounded-full"
            :class="workerHealth.online ? 'bg-emerald-500' : 'bg-red-500'"
          />
          {{ workerHealth.online ? 'Worker' : 'Offline' }}
        </button>

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
        <UButton icon="i-lucide-plus" size="sm" label="New" variant="soft" @click="openCreate()" />
      </div>
    </div>

    <!-- Main content area: view + assistant side by side -->
    <div class="flex-1 flex min-h-0">
      <!-- Canvas view -->
      <div v-if="viewMode === 'canvas'" class="flex-1 relative">
        <div v-if="itemsLoading && !items.length" class="absolute inset-0 flex items-center justify-center">
          <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
        </div>

        <CroutonFlow
          v-if="!itemsLoading || items.length"
          :key="flowKey"
          ref="flowRef"
          :rows="items"
          collection="thinkgraphNodes"
          parent-field="parentId"
          label-field="title"
          :flow-id="flowId || undefined"
          :saved-positions="savedPositions || undefined"
          :additional-edges="additionalEdges"
          minimap
          @node-click="onNodeClick"
          @connect-end="onConnectEnd"
          @node-delete="onNodeDelete"
          @selection-change="onSelectionChange"
        />

        <!-- Empty canvas hint -->
        <div
          v-if="!itemsLoading && !items.length"
          class="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
          <div class="text-center pointer-events-auto">
            <p class="text-sm text-muted mb-3">Click <strong>+ New</strong> to start thinking</p>
            <UButton icon="i-lucide-plus" label="Add first node" size="sm" variant="soft" @click="openCreate()" />
          </div>
        </div>

        <!-- Quick create menu (appears on drag-to-empty) -->
        <div
          v-if="showQuickCreate"
          class="fixed z-50 bg-default border border-default rounded-lg shadow-lg p-2 min-w-[160px]"
          :style="{ left: quickCreatePos.x + 'px', top: quickCreatePos.y + 'px' }"
        >
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted/50 cursor-pointer"
            @click="handleQuickCreate('idea')"
          >
            <UIcon name="i-lucide-plus" class="size-4 text-muted" />
            New node
          </button>
        </div>

        <!-- Canvas multi-select bar -->
        <SelectionBar
          :selected-ids="canvasSelectedIds"
          :nodes="items"
          @synthesize="canvasSynthesize"
          @generate-brief="canvasGenerateBrief"
          @copy-context="canvasCopyContext"
          @use-as-context="() => {}"
          @clear="canvasSelectedIds = []"
          @deselect="canvasDeselect"
        />
      </div>

      <!-- Kanban view -->
      <div v-else-if="viewMode === 'kanban'" class="flex-1 overflow-hidden">
        <CroutonKanban
          :rows="items"
          collection="thinkgraphNodes"
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
                <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full" :class="TEMPLATE_BADGE[item.template] || 'bg-neutral-100 text-neutral-600'">
                  {{ item.template }}
                </span>
                <span class="text-sm font-medium truncate">{{ item.title }}</span>
              </div>
              <p v-if="item.brief" class="text-xs text-muted mt-0.5 line-clamp-1">{{ item.brief }}</p>
            </div>
            <span class="text-[10px] text-muted shrink-0 mt-1">{{ item.assignee || 'pi' }}</span>
            <UDropdownMenu
              v-if="item.template === 'research' && item.assignee === 'human'"
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
    <USlideover v-model:open="showDetail" side="right" :ui="{ width: 'max-w-md' }">
      <template #content>
        <div v-if="selectedItem" class="p-6 h-full overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">{{ selectedItem.title }}</h2>
            <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm" @click="closeDetail" />
          </div>

          <!-- Compact status bar -->
          <div class="flex items-center gap-2 flex-wrap mb-4 px-2 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50">
            <!-- Template badge -->
            <span
              v-if="DETAIL_TEMPLATE_CONFIG[selectedItem.template || 'idea']"
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
              :class="DETAIL_TEMPLATE_CONFIG[selectedItem.template || 'idea'].class"
            >
              <UIcon :name="DETAIL_TEMPLATE_CONFIG[selectedItem.template || 'idea'].icon" class="size-3" />
              {{ DETAIL_TEMPLATE_CONFIG[selectedItem.template || 'idea'].label }}
            </span>
            <!-- Status -->
            <span
              class="inline-flex items-center gap-1 text-[10px] font-medium"
              :class="DETAIL_STATUS_CONFIG[selectedItem.status]?.class || 'text-neutral-400'"
            >
              <UIcon
                :name="DETAIL_STATUS_CONFIG[selectedItem.status]?.icon || 'i-lucide-circle-dashed'"
                class="size-3"
                :class="{ 'animate-spin': selectedItem.status === 'active' }"
              />
              {{ DETAIL_STATUS_CONFIG[selectedItem.status]?.label || selectedItem.status }}
            </span>
            <!-- Pipeline dots -->
            <div class="flex items-center gap-1">
              <div
                v-for="dot in detailPipelineDots"
                :key="dot.stage"
                class="detail-led"
                :class="`detail-led--${dot.state}`"
                :title="`${dot.stage}: ${dot.state}`"
              />
            </div>
            <!-- Signal dot -->
            <span
              v-if="selectedItem.signal"
              class="size-2.5 rounded-full shrink-0"
              :class="{
                'bg-green-400 shadow-[0_0_4px_rgba(16,185,129,0.5)]': selectedItem.signal === 'green',
                'bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.5)] animate-pulse': selectedItem.signal === 'orange',
                'bg-red-400 shadow-[0_0_4px_rgba(239,68,68,0.5)]': selectedItem.signal === 'red',
              }"
              :title="`Signal: ${selectedItem.signal}`"
            />
            <!-- Glanceable tags -->
            <span
              v-for="tag in detailTags"
              :key="tag.emoji"
              :title="tag.title"
              class="text-xs leading-none select-none cursor-default"
            >{{ tag.emoji }}</span>
          </div>

          <!-- Brief -->
          <UFormField label="Brief" class="mb-4">
            <UTextarea
              :model-value="selectedItem.brief || ''"
              placeholder="What needs to happen?"
              :rows="3"
              class="w-full"
              @blur="(e: FocusEvent) => updateItem(selectedItem!.id, { brief: (e.target as HTMLTextAreaElement).value })"
            />
          </UFormField>

          <!-- Current stage output — the main content area -->
          <div v-if="selectedItem.output" class="mb-4">
            <div class="flex items-center gap-2 mb-2">
              <span
                v-if="selectedItem.signal"
                class="size-2.5 rounded-full"
                :class="{
                  'bg-green-400': selectedItem.signal === 'green',
                  'bg-amber-400 animate-pulse': selectedItem.signal === 'orange',
                  'bg-red-400': selectedItem.signal === 'red',
                }"
              />
              <p class="text-sm font-medium text-muted">
                {{ STAGE_LABEL[selectedItem.stage || ''] || 'Output' }}
                <span v-if="selectedItem.signal" class="text-xs opacity-60">— {{ selectedItem.signal }}</span>
              </p>
            </div>

            <!-- When orange with structured questions: research in collapsible accordion -->
            <UAccordion
              v-if="selectedItem.signal === 'orange' && structuredQuestions.length > 0 && researchContent"
              :items="[{ label: STAGE_LABEL[selectedItem.stage || ''] || 'Research', icon: 'i-lucide-file-text', value: 'research' }]"
            >
              <template #body>
                <div class="text-sm whitespace-pre-wrap leading-relaxed" v-html="renderMd(researchContent)" />
              </template>
            </UAccordion>
            <!-- Default: show full output -->
            <div
              v-else
              class="rounded-lg border p-3 text-sm whitespace-pre-wrap leading-relaxed"
              :class="{
                'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200': selectedItem.signal === 'red',
                'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200': selectedItem.signal === 'orange',
                'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-200': selectedItem.signal === 'green',
                'border-default bg-muted/30 text-default': !selectedItem.signal,
              }"
              v-html="renderMd(selectedItem.output)"
            />

            <!-- Red state actions -->
            <div v-if="selectedItem.signal === 'red'" class="flex items-center gap-2 mt-3">
              <UButton
                icon="i-lucide-message-circle-question"
                label="Help me unblock"
                size="sm"
                color="warning"
                :loading="redispatching"
                @click="unblockItem(selectedItem.id)"
              />
              <UButton
                icon="i-lucide-x"
                label="Reject"
                size="sm"
                variant="soft"
                color="red"
                @click="updateItem(selectedItem.id, { status: 'done' })"
              />
            </div>
          </div>

          <!-- Orange response panel — structured questions with inline answers -->
          <div
            v-if="selectedItem.signal === 'orange' && (selectedItem.status === 'waiting' || selectedItem.status === 'blocked')"
            class="mb-4 space-y-3"
          >
            <!-- Structured questions from artifact -->
            <template v-if="structuredQuestions.length > 0">
              <UCard v-for="(q, idx) in structuredQuestions" :key="idx" variant="outline">
                <template #header>
                  <p class="text-sm font-medium leading-relaxed">{{ idx + 1 }}. {{ q.question }}</p>
                </template>

                <!-- RadioGroup for options -->
                <URadioGroup
                  v-if="q.options.length > 0"
                  :model-value="orangeAnswers[idx]"
                  :items="q.options.map(opt => ({ label: opt.label, value: `(${opt.key}) ${opt.label}` }))"
                  variant="card"
                  size="sm"
                  color="warning"
                  @update:model-value="(v: string) => orangeAnswers[idx] = v"
                />

                <!-- Text input for custom answer -->
                <UInput
                  :model-value="q.options.length && orangeAnswers[idx]?.match(/^\([a-zA-Z]\)\s/) ? '' : (orangeAnswers[idx] || '')"
                  :placeholder="q.options.length ? 'Other (custom answer)...' : 'Answer...'"
                  class="w-full"
                  :class="{ 'mt-2': q.options.length }"
                  size="sm"
                  @update:model-value="(v: string) => orangeAnswers[idx] = v"
                />
              </UCard>
            </template>

            <!-- Freeform fallback when no structured questions yet -->
            <UTextarea
              v-model="orangeFreeform"
              :placeholder="structuredQuestions.length > 0 ? 'Additional context (optional)...' : 'Type your response...'"
              :rows="2"
              class="w-full"
            />

            <div class="flex items-center gap-2">
              <UButton
                icon="i-lucide-send"
                label="Respond & Re-dispatch"
                :loading="redispatching"
                :disabled="!hasAnyAnswer"
                color="warning"
                size="sm"
                @click="respondAndRedispatch(selectedItem.id)"
              />
              <UButton
                icon="i-lucide-x"
                label="Dismiss"
                variant="soft"
                color="red"
                size="sm"
                @click="updateItem(selectedItem.id, { status: 'done', signal: 'red' })"
              />
            </div>
          </div>

          <!-- Pipeline history (always visible when stage is set) -->
          <div v-if="selectedItem.stage" class="mb-4">
            <p class="text-xs font-medium text-muted mb-2">Pipeline History</p>
            <div v-if="stageAccordionItems.length > 0">
              <UAccordion :items="stageAccordionItems" type="multiple">
                <template #body="{ item }">
                  <div class="text-xs text-muted leading-relaxed" v-html="item.content" />
                </template>
              </UAccordion>
            </div>
            <p v-else class="text-xs text-muted/60 italic">No previous stages</p>
          </div>

          <!-- Retrospective -->
          <div v-if="selectedItem.retrospective" class="mb-4">
            <div class="rounded-lg bg-neutral-100 dark:bg-neutral-800/50 border border-default p-3">
              <div class="flex items-center gap-1.5 mb-2">
                <UIcon name="i-lucide-lightbulb" class="size-3.5 text-muted" />
                <span class="text-xs font-medium text-muted">Retrospective</span>
              </div>
              <p class="text-xs text-muted whitespace-pre-wrap">{{ selectedItem.retrospective }}</p>
            </div>
          </div>

          <!-- Metadata (collapsed) -->
          <details class="mb-6">
            <summary class="text-xs font-medium text-muted cursor-pointer hover:text-default transition-colors">Metadata</summary>
            <div class="space-y-3 mt-3">
              <div class="grid grid-cols-2 gap-3">
                <UFormField label="Template">
                  <USelectMenu
                    :model-value="selectedItem.template || 'idea'"
                    :items="NODE_TEMPLATES.map(t => t.value)"
                    class="w-full"
                    @update:model-value="(v: string) => updateItem(selectedItem!.id, { template: v, steps: TEMPLATE_STEPS[v] || [] })"
                  />
                </UFormField>
                <UFormField label="Status">
                  <USelectMenu
                    :model-value="selectedItem.status"
                    :items="['idle', 'queued', 'active', 'waiting', 'done', 'blocked']"
                    class="w-full"
                    @update:model-value="(v: string) => updateItem(selectedItem!.id, { status: v })"
                  />
                </UFormField>
              </div>
              <UFormField label="Assignee">
                <USelectMenu
                  :model-value="selectedItem.assignee || 'pi'"
                  :items="ASSIGNEES.map(a => a.value)"
                  class="w-full"
                  @update:model-value="(v: string) => updateItem(selectedItem!.id, { assignee: v })"
                />
              </UFormField>
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
          </details>

          <!-- Actions -->
          <div class="flex flex-wrap gap-2 pt-4 border-t border-default">
            <!-- Break down: decompose into child nodes based on output/brief -->
            <UButton
              v-if="(selectedItem.output || selectedItem.brief) && !items.some(n => n.parentId === selectedItem!.id)"
              icon="i-lucide-git-branch"
              label="Break down"
              variant="soft"
              :loading="decomposing === selectedItem.id"
              @click="decomposeNode(selectedItem.id)"
            />
            <!-- Primary: Send to Pi (for nodes not yet active/done) -->
            <UButton
              v-if="selectedItem.brief && !['active', 'working', 'done'].includes(selectedItem.status)"
              icon="i-lucide-send"
              label="Send to Pi"
              :loading="dispatching"
              @click="dispatchNode(selectedItem.id)"
            />
            <!-- Add child node -->
            <UButton
              icon="i-lucide-plus"
              label="Add child"
              variant="soft"
              @click="openCreate(undefined, selectedItem.id)"
            />
            <!-- Re-dispatch for queued/waiting/blocked -->
            <UButton
              v-if="selectedItem.status === 'queued' || selectedItem.status === 'blocked' || selectedItem.status === 'waiting'"
              icon="i-lucide-send"
              :label="selectedItem.status === 'waiting' ? 'Re-dispatch' : 'Dispatch'"
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
              v-if="selectedItem.stage"
              icon="i-lucide-refresh-ccw"
              label="Reset Pipeline"
              variant="soft"
              color="neutral"
              @click="updateItem(selectedItem.id, { status: 'queued', stage: 'analyst', signal: null, assignee: 'pi', output: null, retrospective: null })"
            />
            <UButton
              v-if="selectedItem.status !== 'done'"
              icon="i-lucide-check"
              label="Mark Done"
              variant="soft"
              color="green"
              @click="updateItem(selectedItem.id, { status: 'done' })"
            />
            <CroutonConfirmButton
              label="Delete"
              confirm-label="Sure?"
              icon="i-lucide-trash-2"
              :loading="deletingId === selectedItem.id"
              class="ml-auto"
              @confirm="deleteNode(selectedItem.id)"
            />
          </div>
        </div>
      </template>
    </USlideover>

    <!-- Create modal -->
    <UModal v-model:open="showCreate">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">New Node</h3>
          <div class="flex flex-col gap-4">
            <UFormField label="Title" required>
              <UInput v-model="createTitle" placeholder="What are you thinking about?" class="w-full" />
            </UFormField>
            <UFormField label="Brief">
              <UTextarea v-model="createBrief" placeholder="Add context, paste a plan, or leave empty..." :rows="4" class="w-full" />
            </UFormField>
          </div>
          <p class="text-xs text-muted mt-3">AI will determine the type and next action based on your content.</p>
          <div class="flex justify-end gap-2 mt-4">
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

<style scoped>
@reference "tailwindcss";

.detail-led {
  @apply size-2 rounded-full transition-all duration-500;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.3), 0 0.5px 0 rgba(255,255,255,0.1);
}
.detail-led--pending { background: rgba(0,0,0,0.15); }
.detail-led--current { background: rgba(255,255,255,0.15); box-shadow: inset 0 1px 2px rgba(0,0,0,0.3), 0 0 2px rgba(255,255,255,0.1); }
.detail-led--done { background: #10b981; box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 0 4px #10b981, 0 0 8px rgba(16,185,129,0.4); }
.detail-led--working { background: #10b981; animation: detail-led-pulse 1.5s ease-in-out infinite; }
.detail-led--green { background: #10b981; box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 0 4px #10b981, 0 0 8px rgba(16,185,129,0.4); }
.detail-led--orange { background: #f59e0b; box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 0 4px #f59e0b, 0 0 8px rgba(245,158,11,0.4); }
.detail-led--red { background: #ef4444; box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 0 4px #ef4444, 0 0 8px rgba(239,68,68,0.4); }

@keyframes detail-led-pulse {
  0%, 100% { opacity: 0.5; box-shadow: inset 0 1px 2px rgba(0,0,0,0.3), 0 0 2px rgba(16,185,129,0.2); }
  50% { opacity: 1; box-shadow: inset 0 1px 1px rgba(255,255,255,0.2), 0 0 6px #10b981, 0 0 12px rgba(16,185,129,0.5); }
}
</style>
