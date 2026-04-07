<script setup lang="ts">
/**
 * Renders Pi agent live activity for a single node, sourced directly from Yjs.
 *
 * Pi worker writes to node.ephemeral.agentStatus and node.ephemeral.agentLog
 * via `apps/thinkgraph-worker/src/yjs-client.ts`. The `ephemeral` namespace
 * is a sibling of `data` at the Yjs level — see packages/crouton-flow/CLAUDE.md.
 * It survives row refetches because useFlowSyncBridge never touches it.
 *
 * This component subscribes to the same flow room (via useFlowSync) and
 * renders the live state.
 *
 * Note: this opens a SECOND WebSocket to the same flow room (CroutonFlow has
 * its own). Acceptable because the component only mounts while the detail
 * slideover is open and a node is selected. A future cleanup could provide
 * the syncState from a parent that owns a single useFlowSync.
 */
/** Mirrors AgentLogEntry from apps/thinkgraph-worker/src/yjs-client.ts */
interface AgentLogEntry {
  type: 'thinking' | 'text' | 'tool_use' | 'tool_result' | 'status' | 'error'
  text?: string
  name?: string
  input?: Record<string, unknown>
  result?: string
  ts: number
}

interface Props {
  flowId: string
  nodeId: string
}

const props = defineProps<Props>()

const syncState = useFlowSync({ flowId: props.flowId, collection: 'thinkgraphNodes' })

// Live node from the Yjs map (reactive via syncState.nodes)
const liveNode = computed(() =>
  syncState.nodes.value.find(n => n.id === props.nodeId),
)

const agentStatus = computed<string | null>(() => {
  const s = liveNode.value?.ephemeral?.agentStatus
  return typeof s === 'string' ? s : null
})

const agentLog = computed<AgentLogEntry[]>(() => {
  const log = liveNode.value?.ephemeral?.agentLog
  return Array.isArray(log) ? log as AgentLogEntry[] : []
})

const hasActivity = computed(() => agentStatus.value !== null || agentLog.value.length > 0)

// Status visual config
const statusVisual = computed(() => {
  switch (agentStatus.value) {
    case 'thinking': return { label: 'Thinking', color: 'bg-violet-400', textColor: 'text-violet-700 dark:text-violet-300', icon: 'i-lucide-brain', pulse: true }
    case 'working': return { label: 'Working', color: 'bg-emerald-400', textColor: 'text-emerald-700 dark:text-emerald-300', icon: 'i-lucide-loader-2', pulse: true, spin: true }
    case 'done': return { label: 'Done', color: 'bg-emerald-500', textColor: 'text-emerald-700 dark:text-emerald-300', icon: 'i-lucide-check-circle', pulse: false }
    case 'error': return { label: 'Error', color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-300', icon: 'i-lucide-alert-circle', pulse: false }
    case 'idle': return { label: 'Idle', color: 'bg-neutral-400', textColor: 'text-neutral-600 dark:text-neutral-400', icon: 'i-lucide-circle', pulse: false }
    default: return null
  }
})

// Auto-scroll log to bottom on new entries — uses nextTick, no setTimeout
const logContainer = ref<HTMLElement | null>(null)

watch(
  () => agentLog.value.length,
  async () => {
    await nextTick()
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  },
  { immediate: true },
)

// Format log entry per type
function formatEntry(entry: AgentLogEntry): { icon: string, iconClass: string, text: string } {
  const ts = new Date(entry.ts).toLocaleTimeString(undefined, { hour12: false })
  switch (entry.type) {
    case 'thinking':
      return { icon: 'i-lucide-brain', iconClass: 'text-violet-400', text: entry.text || '...' }
    case 'text':
      return { icon: 'i-lucide-message-square', iconClass: 'text-blue-400', text: entry.text || '' }
    case 'tool_use':
      return { icon: 'i-lucide-wrench', iconClass: 'text-amber-400', text: entry.name || 'tool' }
    case 'tool_result':
      return { icon: 'i-lucide-check', iconClass: 'text-emerald-400', text: truncate(entry.result || '', 80) }
    case 'status':
      return { icon: 'i-lucide-info', iconClass: 'text-neutral-400', text: entry.text || '' }
    case 'error':
      return { icon: 'i-lucide-alert-triangle', iconClass: 'text-red-400', text: entry.text || 'error' }
    default:
      return { icon: 'i-lucide-circle', iconClass: 'text-neutral-400', text: entry.text || '' }
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour12: false })
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}
</script>

<template>
  <div v-if="hasActivity" class="mb-4">
    <div class="flex items-center gap-2 mb-2">
      <UIcon name="i-lucide-bot" class="size-3.5 text-emerald-500" />
      <p class="text-sm font-medium text-muted">Agent activity</p>
      <div v-if="statusVisual" class="ml-auto flex items-center gap-1.5">
        <span
          class="size-2 rounded-full"
          :class="[statusVisual.color, { 'animate-pulse': statusVisual.pulse }]"
        />
        <span class="text-[10px] font-medium" :class="statusVisual.textColor">
          {{ statusVisual.label }}
        </span>
      </div>
    </div>

    <div
      ref="logContainer"
      class="rounded-lg border border-default bg-muted/20 max-h-64 overflow-y-auto p-2 space-y-1 font-mono text-[11px] leading-relaxed"
    >
      <div v-if="agentLog.length === 0" class="text-muted italic px-1 py-2">
        No log entries yet…
      </div>
      <div
        v-for="(entry, i) in agentLog"
        :key="i"
        class="flex items-start gap-1.5"
      >
        <span class="text-neutral-400 dark:text-neutral-500 shrink-0">
          {{ formatTime(entry.ts) }}
        </span>
        <UIcon
          :name="formatEntry(entry).icon"
          class="size-3 mt-0.5 shrink-0"
          :class="formatEntry(entry).iconClass"
        />
        <span class="text-default break-words min-w-0">
          {{ formatEntry(entry).text }}
        </span>
      </div>
    </div>
  </div>
</template>
