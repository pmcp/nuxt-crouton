<script setup lang="ts">
import type { Ref } from 'vue'
import type { ThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/types'
import { useDropZone } from '@vueuse/core'
import { getNodeTypeConfig, getNodeTypeBadge, STATUS_CONFIG } from '~/utils/thinkgraph-config'
import { uploadedFileToMarkdown, insertAtCursor } from '~/composables/useNodeFileUpload'

interface Props {
  node: ThinkgraphNode
  nodes: ThinkgraphNode[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  refresh: []
  navigate: [nodeId: string]
}>()

const { teamId } = useTeamContext()
const { update } = useCollectionMutation('thinkgraphNodes')
const toast = useToast()
const { uploadFile, uploading } = useNodeFileUpload()

const nodeTypeStyle = computed(() => getNodeTypeConfig(props.node.nodeType))
const nodeTypeBadge = computed(() => getNodeTypeBadge(props.node.nodeType))
const statusConfig = computed(() => STATUS_CONFIG[props.node.status] || STATUS_CONFIG.idle)

// ─── Context ───
const nodesRef = computed(() => props.nodes)
const { buildContext } = useNodeContext(nodesRef)

// ─── Editable fields ───
const editingTitle = ref(false)
const titleDraft = ref('')
const editingBrief = ref(false)
const briefDraft = ref('')
const editingOutput = ref(false)
const outputDraft = ref('')

function startEditTitle() {
  titleDraft.value = props.node.title || ''
  editingTitle.value = true
}

async function saveTitle() {
  const trimmed = titleDraft.value.trim()
  if (!trimmed) {
    editingTitle.value = false
    return
  }
  await update(props.node.id, { title: trimmed })
  editingTitle.value = false
  emit('refresh')
}

function startEditBrief() {
  briefDraft.value = props.node.brief || ''
  editingBrief.value = true
}

async function saveBrief() {
  await update(props.node.id, { brief: briefDraft.value })
  editingBrief.value = false
  emit('refresh')
}

function startEditOutput() {
  outputDraft.value = props.node.output || ''
  editingOutput.value = true
}

async function saveOutput() {
  await update(props.node.id, { output: outputDraft.value })
  editingOutput.value = false
  emit('refresh')
}

// ─── Attachments ───
function getCurrentArtifacts(): any[] {
  return Array.isArray(props.node.artifacts) ? [...props.node.artifacts] : []
}

async function appendArtifact(file: { url: string, pathname: string, filename: string, contentType: string, size: number }, field: string) {
  const artifacts = getCurrentArtifacts()
  artifacts.push({
    type: 'attachment',
    url: file.url,
    pathname: file.pathname,
    filename: file.filename,
    contentType: file.contentType,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'human',
    field,
  })
  await update(props.node.id, { artifacts })
}

async function handleDroppedFiles(
  files: File[],
  field: 'brief' | 'output' | 'node' | 'attachments',
  draft?: Ref<string>,
  textareaEl?: HTMLTextAreaElement | null,
) {
  if (!files.length) return
  for (const file of files) {
    const uploaded = await uploadFile(file)
    if (!uploaded) continue
    const md = uploadedFileToMarkdown(uploaded)
    if (draft && textareaEl) {
      const { value, cursor } = insertAtCursor(textareaEl, draft.value, md)
      draft.value = value
      await nextTick()
      textareaEl.focus()
      textareaEl.setSelectionRange(cursor, cursor)
    }
    else if (draft) {
      draft.value = `${draft.value}\n${md}\n`
    }
    await appendArtifact(uploaded, field)
  }
  emit('refresh')
}

// Drop zones via VueUse — handles preventDefault correctly and works with v-if'd refs
const briefDropRef = ref<HTMLElement | null>(null)
const outputDropRef = ref<HTMLElement | null>(null)
const attachmentsDropRef = ref<HTMLElement | null>(null)

useDropZone(briefDropRef, {
  dataTypes: types => types.some(t => t === 'Files'),
  onDrop: (files) => {
    if (!files) return
    const ta = briefDropRef.value?.querySelector('textarea') as HTMLTextAreaElement | null
    handleDroppedFiles(files, 'brief', briefDraft, ta)
  },
})

useDropZone(outputDropRef, {
  dataTypes: types => types.some(t => t === 'Files'),
  onDrop: (files) => {
    if (!files) return
    const ta = outputDropRef.value?.querySelector('textarea') as HTMLTextAreaElement | null
    handleDroppedFiles(files, 'output', outputDraft, ta)
  },
})

const { isOverDropZone: isOverAttachmentsDropZone } = useDropZone(attachmentsDropRef, {
  dataTypes: types => types.some(t => t === 'Files'),
  onDrop: (files) => {
    if (!files) return
    handleDroppedFiles(files, 'attachments')
  },
})

interface NormalizedAttachment {
  _index: number
  type: string
  url: string
  pathname: string
  filename: string
  contentType: string
  size: number
  isImage: boolean
  uploadedAt?: string
  field?: string
}

const attachments = computed<NormalizedAttachment[]>(() => {
  const arr = Array.isArray(props.node.artifacts) ? props.node.artifacts : []
  return arr
    .map((a: any, i: number): NormalizedAttachment | null => {
      if (!a || (a.type !== 'attachment' && a.type !== 'screenshot')) return null
      const contentType = a.contentType || (a.type === 'screenshot' ? 'image/png' : '')
      return {
        _index: i,
        type: a.type,
        url: a.url || '',
        pathname: a.pathname || '',
        filename: a.filename || a.label || 'untitled',
        contentType,
        size: a.size || 0,
        isImage: contentType.startsWith('image/') || a.type === 'screenshot',
        uploadedAt: a.uploadedAt || a.createdAt,
        field: a.field || a.stage,
      }
    })
    .filter((a: NormalizedAttachment | null): a is NormalizedAttachment => a !== null)
})

async function removeAttachment(index: number) {
  const artifacts = getCurrentArtifacts()
  artifacts.splice(index, 1)
  await update(props.node.id, { artifacts })
  emit('refresh')
}

function formatBytes(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fileIconFor(contentType: string): string {
  if (contentType.startsWith('image/')) return 'i-lucide-image'
  if (contentType === 'application/pdf') return 'i-lucide-file-text'
  if (contentType.startsWith('video/')) return 'i-lucide-video'
  if (contentType.startsWith('audio/')) return 'i-lucide-music'
  return 'i-lucide-file'
}

// ─── Status transitions ───
const statusTransitions: Record<string, string[]> = {
  draft: ['idle', 'rejected'],
  idle: ['thinking', 'working', 'rejected'],
  thinking: ['working', 'needs_attention', 'error'],
  working: ['done', 'needs_attention', 'error'],
  needs_attention: ['idle', 'working', 'rejected'],
  error: ['idle', 'rejected'],
  done: [],
  rejected: [],
}

const availableTransitions = computed(() =>
  statusTransitions[props.node.status] || [],
)

async function changeStatus(newStatus: string) {
  await update(props.node.id, { status: newStatus })
  emit('refresh')
}

// ─── Handoff ───
const handoffTypes = [
  { value: 'task', label: 'Task', icon: 'i-lucide-square-check', description: 'Becomes a task brief' },
  { value: 'claude_code', label: 'Claude Code', icon: 'i-lucide-terminal', description: 'Spawn a new session' },
  { value: 'human_review', label: 'Human Review', icon: 'i-lucide-user-check', description: 'Needs human decision' },
  { value: 'child_nodes', label: 'Child Nodes', icon: 'i-lucide-git-branch', description: 'More thinking needed' },
  { value: 'send', label: 'Send', icon: 'i-lucide-send', description: 'Dispatch to external AI' },
  { value: 'close', label: 'Close', icon: 'i-lucide-check', description: 'Work is done' },
]

async function setHandoff(type: string) {
  await update(props.node.id, { handoffType: type })
  emit('refresh')
}

// ─── Context scope ───
async function setContextScope(scope: string) {
  await update(props.node.id, { contextScope: scope })
  emit('refresh')
}

// ─── Manual context node picker ───
const manualSearchQuery = ref('')
const isManualScope = computed(() => (props.node.contextScope || 'branch') === 'manual')

const selectedContextIds = computed(() => {
  const ids = props.node.contextNodeIds
  if (!ids) return [] as string[]
  return Array.isArray(ids) ? ids as string[] : Object.keys(ids)
})

const selectedContextNodes = computed(() =>
  selectedContextIds.value
    .map(id => props.nodes.find(n => n.id === id))
    .filter((n): n is ThinkgraphNode => !!n),
)

const pickableNodes = computed(() => {
  const q = manualSearchQuery.value.toLowerCase()
  return props.nodes
    .filter(n => n.id !== props.node.id)
    .filter(n => !selectedContextIds.value.includes(n.id))
    .filter(n => !q || n.title.toLowerCase().includes(q) || n.nodeType.toLowerCase().includes(q))
    .slice(0, 20)
})

async function addContextNode(nodeId: string) {
  const ids = [...selectedContextIds.value, nodeId]
  await update(props.node.id, { contextNodeIds: ids })
  manualSearchQuery.value = ''
  emit('refresh')
}

async function removeContextNode(nodeId: string) {
  const ids = selectedContextIds.value.filter(id => id !== nodeId)
  await update(props.node.id, { contextNodeIds: ids })
  emit('refresh')
}

// ─── Backlinks (nodes that reference this node via contextNodeIds) ───
const backlinks = computed(() =>
  props.nodes.filter((n) => {
    if (n.id === props.node.id) return false
    const ctxIds = Array.isArray(n.contextNodeIds) ? n.contextNodeIds : []
    return ctxIds.includes(props.node.id)
  }),
)

// ─── Context preview ───
const showContextPreview = ref(false)
const contextPayload = computed(() => buildContext(props.node.id))

async function copyContext() {
  if (!contextPayload.value.markdown) return
  await navigator.clipboard.writeText(contextPayload.value.markdown)
  toast.add({ title: 'Context copied to clipboard', color: 'success' })
}

// ─── Ancestor chain ───
const ancestors = computed(() => {
  const chain: ThinkgraphNode[] = []
  let current = props.node
  while (current.parentId) {
    const parent = props.nodes.find(n => n.id === current.parentId)
    if (!parent) break
    chain.unshift(parent)
    current = parent
  }
  return chain
})

// ─── Children ───
const children = computed(() =>
  props.nodes.filter(n => n.parentId === props.node.id),
)

// ─── Token usage from artifacts ───
interface TokenUsageArtifact {
  type: 'token-usage'
  stage: string
  inputTokens: number
  outputTokens: number
  timestamp: string
}

function formatTokenCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toString()
}

const tokenUsageArtifacts = computed<TokenUsageArtifact[]>(() => {
  const artifacts = props.node.artifacts
  if (!artifacts || !Array.isArray(artifacts)) return []
  return artifacts.filter(
    (a): a is TokenUsageArtifact =>
      a?.type === 'token-usage'
      && typeof a.inputTokens === 'number'
      && typeof a.outputTokens === 'number',
  )
})

const tokenUsageTotals = computed(() => {
  const items = tokenUsageArtifacts.value
  if (!items.length) return null
  const input = items.reduce((sum, a) => sum + a.inputTokens, 0)
  const output = items.reduce((sum, a) => sum + a.outputTokens, 0)
  return { input, output, total: input + output }
})

const tokenUsageByStage = computed(() => {
  const items = tokenUsageArtifacts.value
  if (!items.length) return []
  // Group by stage, summing tokens (a stage can appear multiple times in loops)
  const map = new Map<string, { input: number; output: number }>()
  for (const a of items) {
    const existing = map.get(a.stage) || { input: 0, output: 0 }
    existing.input += a.inputTokens
    existing.output += a.outputTokens
    map.set(a.stage, existing)
  }
  return Array.from(map.entries()).map(([stage, tokens]) => ({
    stage,
    ...tokens,
  }))
})
</script>

<template>
  <div class="w-[400px] border-l border-default flex-shrink-0 flex flex-col bg-default overflow-hidden relative">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-default shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <span
          class="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
          :class="nodeTypeBadge"
        >
          {{ node.nodeType?.replace('_', ' ') }}
        </span>
        <span
          v-if="statusConfig.icon"
          class="shrink-0"
        >
          <UIcon
            :name="statusConfig.icon"
            class="size-4"
            :class="{
              'text-neutral-400': node.status === 'draft',
              'text-blue-400': node.status === 'thinking',
              'text-primary-500': node.status === 'working',
              'text-orange-500': node.status === 'needs_attention',
              'text-green-500': node.status === 'done',
              'text-red-500': node.status === 'error',
            }"
          />
        </span>
        <template v-if="!editingTitle">
          <span class="text-sm font-medium truncate">{{ node.title }}</span>
          <UButton
            icon="i-lucide-pencil"
            size="xs"
            variant="ghost"
            color="neutral"
            class="shrink-0"
            @click="startEditTitle"
          />
        </template>
        <template v-else>
          <UInput
            v-model="titleDraft"
            size="xs"
            autofocus
            class="flex-1 min-w-0"
            @keydown.enter.prevent="saveTitle"
            @keydown.escape.prevent="editingTitle = false"
          />
          <UButton size="xs" class="shrink-0" @click="saveTitle">Save</UButton>
          <UButton size="xs" variant="ghost" color="neutral" class="shrink-0" @click="editingTitle = false">Cancel</UButton>
        </template>
      </div>
      <UButton
        icon="i-lucide-x"
        size="sm"
        variant="ghost"
        color="neutral"
        @click="emit('close')"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Status transitions -->
      <div v-if="availableTransitions.length" class="px-4 py-3 border-b border-default">
        <p class="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Status</p>
        <div class="flex items-center gap-2">
          <span class="text-sm capitalize">{{ node.status?.replace('_', ' ') }}</span>
          <UIcon name="i-lucide-arrow-right" class="size-3 text-muted" />
          <div class="flex gap-1.5">
            <UButton
              v-for="transition in availableTransitions"
              :key="transition"
              size="xs"
              variant="soft"
              :color="transition === 'done' ? 'success' : transition === 'error' ? 'error' : 'neutral'"
              @click="changeStatus(transition)"
            >
              {{ transition.replace('_', ' ') }}
            </UButton>
          </div>
        </div>
      </div>

      <!-- Brief -->
      <div class="px-4 py-3 border-b border-default">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[11px] font-semibold text-muted uppercase tracking-wider">Brief</p>
          <UButton
            v-if="!editingBrief"
            icon="i-lucide-pencil"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="startEditBrief"
          />
        </div>
        <div v-if="editingBrief">
          <div ref="briefDropRef" class="relative mb-2">
            <UTextarea
              v-model="briefDraft"
              :rows="4"
              placeholder="What needs to happen here? (drop files to attach)"
              class="w-full"
            />
          </div>
          <div class="flex gap-2 items-center">
            <UButton size="xs" @click="saveBrief">Save</UButton>
            <UButton size="xs" variant="ghost" color="neutral" @click="editingBrief = false">Cancel</UButton>
            <span v-if="uploading" class="text-[10px] text-muted inline-flex items-center gap-1">
              <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" />
              Uploading…
            </span>
          </div>
        </div>
        <div v-else-if="node.brief" class="text-sm text-default prose prose-sm dark:prose-invert max-w-none">
          <MDC :value="node.brief" tag="div" />
        </div>
        <p v-else class="text-sm text-muted italic">No brief yet</p>
      </div>

      <!-- Output -->
      <div class="px-4 py-3 border-b border-default">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[11px] font-semibold text-muted uppercase tracking-wider">Output</p>
          <UButton
            v-if="!editingOutput"
            icon="i-lucide-pencil"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="startEditOutput"
          />
        </div>
        <div v-if="editingOutput">
          <div ref="outputDropRef" class="relative mb-2">
            <UTextarea
              v-model="outputDraft"
              :rows="6"
              placeholder="Handoff brief — what was done, key decisions, artifacts, open items (drop files to attach)"
              class="w-full"
            />
          </div>
          <div class="flex gap-2 items-center">
            <UButton size="xs" @click="saveOutput">Save</UButton>
            <UButton size="xs" variant="ghost" color="neutral" @click="editingOutput = false">Cancel</UButton>
            <span v-if="uploading" class="text-[10px] text-muted inline-flex items-center gap-1">
              <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" />
              Uploading…
            </span>
          </div>
        </div>
        <div v-else-if="node.output" class="text-sm text-default prose prose-sm dark:prose-invert max-w-none">
          <MDC :value="node.output" tag="div" />
        </div>
        <p v-else class="text-sm text-muted italic">No output yet</p>
      </div>

      <!-- Attachments -->
      <div class="px-4 py-3 border-b border-default">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[11px] font-semibold text-muted uppercase tracking-wider">
            Attachments
            <span v-if="attachments.length" class="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 font-mono ml-1">
              {{ attachments.length }}
            </span>
          </p>
        </div>

        <ul v-if="attachments.length" class="space-y-1.5 mb-2">
          <li
            v-for="att in attachments"
            :key="att._index"
            class="group flex items-center gap-2 p-1.5 rounded-md border border-default hover:border-primary/50 transition-colors"
          >
            <a
              v-if="att.isImage"
              :href="att.url"
              target="_blank"
              rel="noopener"
              class="shrink-0"
            >
              <img
                :src="att.url"
                :alt="att.filename"
                class="size-10 object-cover rounded border border-default"
              >
            </a>
            <div
              v-else
              class="shrink-0 size-10 rounded border border-default flex items-center justify-center bg-neutral-50 dark:bg-neutral-900"
            >
              <UIcon :name="fileIconFor(att.contentType)" class="size-5 text-muted" />
            </div>

            <div class="min-w-0 flex-1">
              <a
                :href="att.url"
                target="_blank"
                rel="noopener"
                :download="att.isImage ? undefined : att.filename"
                class="block text-xs font-medium truncate hover:underline"
              >
                {{ att.filename }}
              </a>
              <p class="text-[10px] text-muted">
                <span v-if="att.size">{{ formatBytes(att.size) }}</span>
                <span v-if="att.field" class="ml-1">· {{ att.field }}</span>
              </p>
            </div>

            <UButton
              icon="i-lucide-x"
              size="xs"
              variant="ghost"
              color="neutral"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click="removeAttachment(att._index)"
            />
          </li>
        </ul>

        <div
          ref="attachmentsDropRef"
          class="border-2 border-dashed rounded-md p-3 text-center transition-colors"
          :class="isOverAttachmentsDropZone
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
            : 'border-default hover:border-primary/50'"
        >
          <UIcon name="i-lucide-upload-cloud" class="size-5 text-muted mx-auto mb-1" />
          <p class="text-[11px] text-muted">
            <span class="font-medium">Drop files here</span> to attach to this node
          </p>
          <p class="text-[10px] text-muted mt-0.5 opacity-70">
            Or drop into the brief / output to insert inline
          </p>
        </div>
      </div>

      <!-- Handoff -->
      <div class="px-4 py-3 border-b border-default">
        <p class="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Handoff</p>
        <div v-if="node.handoffType" class="flex items-center gap-2 mb-2">
          <UIcon
            :name="handoffTypes.find(h => h.value === node.handoffType)?.icon || 'i-lucide-arrow-right'"
            class="size-4 text-primary"
          />
          <span class="text-sm font-medium capitalize">{{ node.handoffType.replace('_', ' ') }}</span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="ht in handoffTypes"
            :key="ht.value"
            class="flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors text-sm"
            :class="node.handoffType === ht.value
              ? 'border-primary bg-primary-50 dark:bg-primary-950/30'
              : 'border-default hover:border-primary/50'"
            @click="setHandoff(ht.value)"
          >
            <UIcon :name="ht.icon" class="size-4 shrink-0" :class="node.handoffType === ht.value ? 'text-primary' : 'text-muted'" />
            <div class="min-w-0">
              <p class="font-medium text-xs">{{ ht.label }}</p>
            </div>
          </button>
        </div>
      </div>

      <!-- Context scope -->
      <div class="px-4 py-3 border-b border-default">
        <p class="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Context Scope</p>
        <div class="flex gap-2">
          <UButton
            v-for="scope in ['full', 'branch', 'manual']"
            :key="scope"
            size="xs"
            :variant="(node.contextScope || 'branch') === scope ? 'solid' : 'outline'"
            :color="(node.contextScope || 'branch') === scope ? 'primary' : 'neutral'"
            @click="setContextScope(scope)"
          >
            {{ scope }}
          </UButton>
        </div>

        <!-- Manual context node picker -->
        <div v-if="isManualScope" class="mt-3">
          <!-- Selected context nodes -->
          <div v-if="selectedContextNodes.length" class="flex flex-wrap gap-1.5 mb-2">
            <span
              v-for="cn in selectedContextNodes"
              :key="cn.id"
              class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
            >
              <UIcon :name="getNodeTypeConfig(cn.nodeType).icon" class="size-3" />
              <span class="truncate max-w-[140px]">{{ cn.title }}</span>
              <button class="hover:text-red-500 transition-colors ml-0.5" @click="removeContextNode(cn.id)">
                <UIcon name="i-lucide-x" class="size-3" />
              </button>
            </span>
          </div>

          <!-- Search input -->
          <UInput
            v-model="manualSearchQuery"
            size="xs"
            placeholder="Search nodes to add..."
            icon="i-lucide-search"
            class="w-full"
          />

          <!-- Pickable nodes dropdown -->
          <div v-if="manualSearchQuery && pickableNodes.length" class="mt-1.5 max-h-[160px] overflow-y-auto rounded-md border border-default bg-elevated">
            <button
              v-for="pn in pickableNodes"
              :key="pn.id"
              class="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted/50 transition-colors"
              @click="addContextNode(pn.id)"
            >
              <UIcon :name="getNodeTypeConfig(pn.nodeType).icon" class="size-3.5 shrink-0" :class="getNodeTypeConfig(pn.nodeType).color" />
              <span class="truncate">{{ pn.title }}</span>
              <span class="text-[10px] text-muted ml-auto shrink-0">{{ pn.nodeType }}</span>
            </button>
          </div>
          <p v-else-if="manualSearchQuery && !pickableNodes.length" class="text-xs text-muted mt-1.5">
            No matching nodes
          </p>
        </div>
      </div>

      <!-- Context preview -->
      <div class="px-4 py-3 border-b border-default">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <p class="text-[11px] font-semibold text-muted uppercase tracking-wider">Context</p>
            <span v-if="contextPayload.tokenEstimate" class="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-muted font-mono">
              ~{{ contextPayload.tokenEstimate.toLocaleString() }} tokens
            </span>
          </div>
          <div class="flex items-center gap-1">
            <UButton
              v-if="contextPayload.markdown"
              icon="i-lucide-copy"
              size="xs"
              variant="ghost"
              color="neutral"
              title="Copy context"
              @click="copyContext"
            />
            <UButton
              icon="i-lucide-eye"
              size="xs"
              variant="ghost"
              color="neutral"
              :class="showContextPreview ? 'text-primary' : ''"
              title="Toggle preview"
              @click="showContextPreview = !showContextPreview"
            />
          </div>
        </div>
        <p v-if="!contextPayload.chain.length" class="text-sm text-muted italic">
          {{ isManualScope ? 'Select nodes above to build context' : 'No context chain' }}
        </p>
        <template v-else>
          <div class="flex items-center gap-1.5 text-xs text-muted mb-1">
            <span>{{ contextPayload.chain.length }} nodes in chain</span>
          </div>
          <div v-if="showContextPreview" class="mt-2 p-3 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-default max-h-[300px] overflow-y-auto">
            <pre class="text-xs whitespace-pre-wrap font-mono text-default leading-relaxed">{{ contextPayload.markdown }}</pre>
          </div>
        </template>
      </div>

      <!-- Backlinks (nodes that reference this node) -->
      <div v-if="backlinks.length" class="px-4 py-3 border-b border-default">
        <p class="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
          Referenced by
          <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 font-mono ml-1">{{ backlinks.length }}</span>
        </p>
        <div class="flex flex-col gap-1">
          <button
            v-for="bl in backlinks"
            :key="bl.id"
            class="flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm hover:bg-muted/50 transition-colors"
            @click="$emit('navigate', bl.id)"
          >
            <UIcon :name="getNodeTypeConfig(bl.template || 'idea').icon" class="size-3.5 shrink-0" />
            <span class="truncate flex-1">{{ bl.title }}</span>
            <UIcon name="i-lucide-arrow-right" class="size-3 text-muted shrink-0" />
          </button>
        </div>
      </div>

      <!-- Ancestor chain -->
      <div v-if="ancestors.length" class="px-4 py-3 border-b border-default">
        <p class="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
          Context Chain ({{ ancestors.length }})
        </p>
        <div class="space-y-1.5">
          <div
            v-for="(ancestor, i) in ancestors"
            :key="ancestor.id"
            class="flex items-center gap-2 text-sm"
          >
            <span class="text-[10px] text-muted font-mono w-4 text-right shrink-0">{{ i + 1 }}</span>
            <UIcon :name="getNodeTypeConfig(ancestor.nodeType).icon" class="size-3.5 shrink-0" :class="getNodeTypeConfig(ancestor.nodeType).color" />
            <span class="truncate">{{ ancestor.title }}</span>
            <UIcon
              v-if="ancestor.output"
              name="i-lucide-file-check"
              class="size-3 text-green-500 shrink-0 ml-auto"
              title="Has output"
            />
          </div>
        </div>
      </div>

      <!-- Children -->
      <div v-if="children.length" class="px-4 py-3 border-b border-default">
        <p class="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
          Children ({{ children.length }})
        </p>
        <div class="space-y-1.5">
          <div
            v-for="child in children"
            :key="child.id"
            class="flex items-center gap-2 text-sm"
          >
            <UIcon :name="getNodeTypeConfig(child.nodeType).icon" class="size-3.5 shrink-0" :class="getNodeTypeConfig(child.nodeType).color" />
            <span class="truncate">{{ child.title }}</span>
            <span
              class="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ml-auto"
              :class="{
                'bg-neutral-100 text-neutral-500 dark:bg-neutral-800': child.status === 'idle' || child.status === 'draft',
                'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400': child.status === 'thinking',
                'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400': child.status === 'working',
                'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400': child.status === 'done',
                'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400': child.status === 'needs_attention',
                'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400': child.status === 'error',
              }"
            >
              {{ child.status?.replace('_', ' ') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Token Usage per Stage -->
      <div v-if="tokenUsageByStage.length" class="px-4 py-3 border-b border-default">
        <p class="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
          Token Usage
        </p>
        <div class="space-y-2">
          <div
            v-for="entry in tokenUsageByStage"
            :key="entry.stage"
            class="flex items-center justify-between text-sm"
          >
            <span class="text-muted capitalize">{{ entry.stage }}</span>
            <span class="inline-flex items-center gap-1.5 font-mono text-xs">
              <span class="text-primary-500">{{ formatTokenCount(entry.input) }} in</span>
              <span class="text-muted">/</span>
              <span class="text-green-500">{{ formatTokenCount(entry.output) }} out</span>
            </span>
          </div>
          <!-- Total row -->
          <div v-if="tokenUsageTotals && tokenUsageByStage.length > 1" class="flex items-center justify-between text-sm pt-1.5 border-t border-default">
            <span class="text-muted font-medium">Total</span>
            <span class="inline-flex items-center gap-1.5 font-mono text-xs font-medium">
              <span class="text-primary-500">{{ formatTokenCount(tokenUsageTotals.input) }} in</span>
              <span class="text-muted">/</span>
              <span class="text-green-500">{{ formatTokenCount(tokenUsageTotals.output) }} out</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Metadata -->
      <div class="px-4 py-3">
        <p class="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Details</p>
        <div class="space-y-1.5 text-sm">
          <div v-if="node.origin" class="flex items-center justify-between">
            <span class="text-muted">Origin</span>
            <span>{{ node.origin }}</span>
          </div>
          <div v-if="node.worktree" class="flex items-center justify-between">
            <span class="text-muted">Worktree</span>
            <span class="font-mono text-xs">{{ node.worktree }}</span>
          </div>
          <div v-if="tokenUsageTotals" class="flex items-center justify-between">
            <span class="text-muted">Tokens</span>
            <span class="inline-flex items-center gap-1.5">
              <UBadge size="sm" variant="subtle" color="primary">
                <UIcon name="i-lucide-arrow-down" class="size-3" />
                {{ formatTokenCount(tokenUsageTotals.input) }} in
              </UBadge>
              <UBadge size="sm" variant="subtle" color="success">
                <UIcon name="i-lucide-arrow-up" class="size-3" />
                {{ formatTokenCount(tokenUsageTotals.output) }} out
              </UBadge>
            </span>
          </div>
          <div v-else-if="node.tokenCount" class="flex items-center justify-between">
            <span class="text-muted">Tokens</span>
            <span>{{ node.tokenCount.toLocaleString() }}</span>
          </div>
          <div v-if="node.stepIndex != null" class="flex items-center justify-between">
            <span class="text-muted">Step</span>
            <span>#{{ node.stepIndex }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Uploading overlay -->
    <div
      v-if="uploading"
      class="absolute top-2 right-2 z-50 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-900/80 text-white text-[11px]"
    >
      <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" />
      Uploading…
    </div>
  </div>
</template>
