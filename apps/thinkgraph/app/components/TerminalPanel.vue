<script setup lang="ts">
interface Props {
  nodeId: string
  teamId: string
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

const lines = ref<string[]>([])
const status = ref<'thinking' | 'working' | 'done' | 'error' | 'idle'>('idle')
const terminalEl = ref<HTMLElement>()
const steerMessage = ref('')
const isSending = ref(false)
let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function connect() {
  if (!props.nodeId || !props.teamId) return
  disconnect()

  lines.value = []
  status.value = 'thinking'

  // Connect to the terminal WebSocket as a read-only listener
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = `${protocol}//${window.location.host}/api/teams/${props.teamId}/terminal-ws/${props.nodeId}`
  ws = new WebSocket(url)

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'output') {
        lines.value.push(data.data)
        if (lines.value.length > 200) {
          lines.value.splice(0, lines.value.length - 200)
        }
        nextTick(() => scrollToBottom())
      }
      else if (data.type === 'status') {
        status.value = data.data as typeof status.value
      }
      else if (data.type === 'done') {
        status.value = 'done'
        lines.value.push('[system] Session completed')
        nextTick(() => scrollToBottom())
      }
      else if (data.type === 'error') {
        status.value = 'error'
        if (data.data !== 'No active session') {
          lines.value.push(`[error] ${data.data}`)
          nextTick(() => scrollToBottom())
        }
      }
    }
    catch {}
  }

  ws.onclose = () => {
    if (status.value === 'thinking' || status.value === 'working') {
      // Reconnect if session might still be active
      reconnectTimer = setTimeout(() => connect(), 2000)
    }
  }

  ws.onerror = () => {
    // Will trigger onclose
  }
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    ws.close()
    ws = null
  }
}

function scrollToBottom() {
  if (terminalEl.value) {
    terminalEl.value.scrollTop = terminalEl.value.scrollHeight
  }
}

const statusLabel = computed(() => {
  switch (status.value) {
    case 'thinking': return 'Thinking...'
    case 'working': return 'Working...'
    case 'done': return 'Done'
    case 'error': return 'Error'
    default: return 'Idle'
  }
})

const statusColor = computed(() => {
  switch (status.value) {
    case 'thinking': return 'text-blue-400'
    case 'working': return 'text-green-400'
    case 'done': return 'text-green-500'
    case 'error': return 'text-red-400'
    default: return 'text-neutral-400'
  }
})

watch(() => props.open, (newVal) => {
  if (newVal) connect()
  else disconnect()
})

watch(() => props.nodeId, () => {
  if (props.open) connect()
})

function sendSteer() {
  if (!steerMessage.value.trim() || isSending.value || !ws || ws.readyState !== WebSocket.OPEN) return
  isSending.value = true
  try {
    ws.send(JSON.stringify({ type: 'steer', message: steerMessage.value }))
    lines.value.push(`> ${steerMessage.value}`)
    steerMessage.value = ''
    nextTick(() => scrollToBottom())
  }
  catch (err) {
    lines.value.push(`[error] Failed to send: ${(err as Error).message}`)
  }
  finally {
    isSending.value = false
  }
}

function sendAbort() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  try {
    ws.send(JSON.stringify({ type: 'abort' }))
    lines.value.push('[system] Abort signal sent')
    nextTick(() => scrollToBottom())
  }
  catch (err) {
    lines.value.push(`[error] Failed to abort: ${(err as Error).message}`)
  }
}

onUnmounted(() => disconnect())
</script>

<template>
  <USlideover v-model:open="isOpen">
    <template #content="{ close }">
      <div class="flex flex-col h-full bg-neutral-950">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-terminal" class="size-4 text-green-400" />
            <span class="text-sm font-medium text-neutral-200">Claude Code</span>
            <span class="text-xs font-mono px-1.5 py-0.5 rounded" :class="statusColor">
              {{ statusLabel }}
            </span>
            <span
              v-if="status === 'thinking' || status === 'working'"
              class="size-2 rounded-full bg-green-400 animate-pulse"
            />
          </div>
          <button
            class="text-neutral-400 hover:text-neutral-200 cursor-pointer"
            @click="close"
          >
            <UIcon name="i-lucide-x" class="size-4" />
          </button>
        </div>

        <!-- Terminal output -->
        <div
          ref="terminalEl"
          class="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
        >
          <div v-if="lines.length === 0 && status !== 'error'" class="text-neutral-500">
            <span v-if="status === 'thinking'" class="animate-pulse">Waiting for Claude Code to start...</span>
            <span v-else-if="status === 'idle'">No active session for this node.</span>
          </div>
          <pre
            v-for="(line, i) in lines"
            :key="i"
            class="whitespace-pre-wrap break-words"
            :class="line.startsWith('[stderr]') ? 'text-red-400/70' : line.startsWith('[error]') ? 'text-red-400' : 'text-green-300/90'"
          >{{ line }}</pre>
          <span
            v-if="status === 'thinking' || status === 'working'"
            class="inline-block w-2 h-4 bg-green-400 animate-pulse"
          />
        </div>

        <!-- Steering input (visible when agent is working) -->
        <div
          v-if="status === 'thinking' || status === 'working'"
          class="px-4 py-2 border-t border-neutral-800 flex items-center gap-2"
        >
          <input
            v-model="steerMessage"
            type="text"
            placeholder="Steer the agent..."
            class="flex-1 bg-neutral-900 text-neutral-200 text-xs font-mono px-3 py-1.5 rounded border border-neutral-700 focus:border-green-500 focus:outline-none placeholder-neutral-600"
            @keydown.enter="sendSteer"
          >
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-send"
            :loading="isSending"
            :disabled="!steerMessage.trim()"
            @click="sendSteer"
          />
          <UButton
            size="xs"
            color="error"
            variant="soft"
            icon="i-lucide-square"
            label="Stop"
            @click="sendAbort"
          />
        </div>

        <!-- Footer -->
        <div class="px-4 py-2 border-t border-neutral-800 flex items-center justify-between">
          <span class="text-[10px] text-neutral-500 font-mono">{{ lines.length }} lines</span>
          <span v-if="status === 'done'" class="text-[10px] text-green-500">Process completed</span>
          <span v-if="status === 'error'" class="text-[10px] text-red-400">Process failed</span>
        </div>
      </div>
    </template>
  </USlideover>
</template>
