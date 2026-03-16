<script setup lang="ts">
import type { ThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/types'
import { getNodeTypeConfig, getNodeTypeBadge, STATUS_CONFIG } from '~/utils/thinkgraph-config'

interface Props {
  node: ThinkgraphNode
  nodes: ThinkgraphNode[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  refresh: []
}>()

const { teamId } = useTeamContext()
const { update } = useCollectionMutation('thinkgraphNodes')
const toast = useToast()

const nodeTypeStyle = computed(() => getNodeTypeConfig(props.node.nodeType))
const nodeTypeBadge = computed(() => getNodeTypeBadge(props.node.nodeType))
const statusConfig = computed(() => STATUS_CONFIG[props.node.status] || STATUS_CONFIG.idle)

// ─── Editable fields ───
const editingBrief = ref(false)
const briefDraft = ref('')
const editingOutput = ref(false)
const outputDraft = ref('')

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

// ─── Status transitions ───
const statusTransitions: Record<string, string[]> = {
  draft: ['idle'],
  idle: ['thinking', 'working'],
  thinking: ['working', 'needs_attention', 'error'],
  working: ['done', 'needs_attention', 'error'],
  needs_attention: ['idle', 'working'],
  error: ['idle'],
  done: [],
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
</script>

<template>
  <div class="w-[400px] border-l border-default flex-shrink-0 flex flex-col bg-default overflow-hidden">
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
        <span class="text-sm font-medium truncate">{{ node.title }}</span>
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
          <UTextarea
            v-model="briefDraft"
            :rows="4"
            placeholder="What needs to happen here?"
            class="w-full mb-2"
          />
          <div class="flex gap-2">
            <UButton size="xs" @click="saveBrief">Save</UButton>
            <UButton size="xs" variant="ghost" color="neutral" @click="editingBrief = false">Cancel</UButton>
          </div>
        </div>
        <p v-else-if="node.brief" class="text-sm text-default whitespace-pre-wrap">
          {{ node.brief }}
        </p>
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
          <UTextarea
            v-model="outputDraft"
            :rows="6"
            placeholder="Handoff brief — what was done, key decisions, artifacts, open items"
            class="w-full mb-2"
          />
          <div class="flex gap-2">
            <UButton size="xs" @click="saveOutput">Save</UButton>
            <UButton size="xs" variant="ghost" color="neutral" @click="editingOutput = false">Cancel</UButton>
          </div>
        </div>
        <div v-else-if="node.output" class="text-sm text-default whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
          {{ node.output }}
        </div>
        <p v-else class="text-sm text-muted italic">No output yet</p>
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
          <div v-if="node.tokenCount" class="flex items-center justify-between">
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
  </div>
</template>
