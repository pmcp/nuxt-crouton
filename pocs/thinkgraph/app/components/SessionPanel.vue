<script setup lang="ts">
import type { AgentMessage, AgentContentBlock, ExtensionUIRequest } from '../composables/useAgentSession'

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

const nodeIdRef = computed(() => props.nodeId || null)
const teamIdRef = computed(() => props.teamId || undefined)

const {
  messages,
  legacyLines,
  status,
  sessionMode,
  pendingUIRequest,
  isConnected,
  isActive,
  isProcessing,
  canSendPrompt,
  statusLabel,
  statusColor,
  connect,
  disconnect,
  send,
  sendPrompt,
  sendSteer,
  sendFollowUp,
  sendAbort,
  sendUIResponse,
} = useAgentSession(nodeIdRef, teamIdRef)

const messagesEl = ref<HTMLElement>()
const inputText = ref('')
const isSending = ref(false)
const expandedTools = ref<Set<string>>(new Set())

// Input mode: prompt when idle, steer when working
const inputMode = computed(() => {
  if (status.value === 'working' || status.value === 'thinking') return 'steer'
  return 'prompt'
})

const inputPlaceholder = computed(() => {
  switch (inputMode.value) {
    case 'steer': return 'Steer the agent...'
    default: return 'Send a message...'
  }
})

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
}

// Auto-scroll on new messages
watch(() => messages.value.length, scrollToBottom)
watch(() => legacyLines.value.length, scrollToBottom)

function handleSend() {
  if (!inputText.value.trim() || isSending.value) return
  isSending.value = true
  try {
    send(inputText.value)
    inputText.value = ''
  } finally {
    isSending.value = false
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function toggleToolExpand(toolCallId: string) {
  if (expandedTools.value.has(toolCallId)) {
    expandedTools.value.delete(toolCallId)
  } else {
    expandedTools.value.add(toolCallId)
  }
  expandedTools.value = new Set(expandedTools.value)
}

function handleUIResponse(value: string) {
  if (pendingUIRequest.value) {
    sendUIResponse(pendingUIRequest.value.requestId, value)
  }
}

// Connection lifecycle
watch(() => props.open, (newVal) => {
  if (newVal) connect()
  else disconnect()
})

watch(() => props.nodeId, () => {
  if (props.open) connect()
})

onUnmounted(() => disconnect())

// ─── Rendering helpers ───

function getToolIcon(toolName: string): string {
  if (toolName.includes('read') || toolName.includes('file')) return 'i-lucide-file-text'
  if (toolName.includes('write') || toolName.includes('edit')) return 'i-lucide-pencil'
  if (toolName.includes('bash') || toolName.includes('exec')) return 'i-lucide-terminal'
  if (toolName.includes('search') || toolName.includes('grep') || toolName.includes('find')) return 'i-lucide-search'
  if (toolName.includes('create_node')) return 'i-lucide-plus-circle'
  if (toolName.includes('update_node')) return 'i-lucide-edit-3'
  if (toolName.includes('store_artifact')) return 'i-lucide-archive'
  return 'i-lucide-wrench'
}

function formatToolInput(input: Record<string, unknown> | undefined): string {
  if (!input) return ''
  return Object.entries(input)
    .map(([k, v]) => {
      const val = typeof v === 'string' ? (v.length > 100 ? v.slice(0, 100) + '...' : v) : JSON.stringify(v)
      return `${k}: ${val}`
    })
    .join('\n')
}

/** Find tool result for a given tool call ID */
function findToolResult(toolCallId: string | undefined): string | undefined {
  if (!toolCallId) return undefined
  for (const msg of messages.value) {
    for (const block of msg.content) {
      if (block.type === 'tool_result' && block.toolCallId === toolCallId) {
        return block.result
      }
    }
  }
  return undefined
}
</script>

<template>
  <USlideover v-model:open="isOpen" :ui="{ width: 'max-w-xl' }">
    <template #content="{ close }">
      <div class="flex flex-col h-full bg-neutral-950">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-bot" class="size-4 text-cyan-400" />
            <span class="text-sm font-medium text-neutral-200">Pi Agent</span>
            <span class="text-xs font-mono px-1.5 py-0.5 rounded" :class="statusColor">
              {{ statusLabel }}
            </span>
            <span
              v-if="isProcessing"
              class="size-2 rounded-full bg-green-400 animate-pulse"
            />
          </div>
          <div class="flex items-center gap-1">
            <UButton
              v-if="isActive"
              size="xs"
              color="error"
              variant="soft"
              icon="i-lucide-square"
              label="Stop"
              @click="sendAbort"
            />
            <button
              class="text-neutral-400 hover:text-neutral-200 cursor-pointer"
              @click="close"
            >
              <UIcon name="i-lucide-x" class="size-4" />
            </button>
          </div>
        </div>

        <!-- Messages area -->
        <div
          ref="messagesEl"
          class="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        >
          <!-- Empty state -->
          <div v-if="messages.length === 0 && legacyLines.length === 0 && status !== 'error'" class="text-neutral-500 text-sm">
            <span v-if="status === 'thinking'" class="animate-pulse">Waiting for agent to start...</span>
            <span v-else-if="status === 'idle' || status === 'disconnected'">No active session. Send a prompt to start.</span>
          </div>

          <!-- Rich mode: structured messages -->
          <template v-if="sessionMode === 'rich'">
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="group"
            >
              <!-- User message -->
              <div v-if="msg.role === 'user'" class="flex justify-end">
                <div class="max-w-[85%] px-3 py-2 rounded-xl bg-cyan-900/40 border border-cyan-800/30">
                  <div v-if="msg.mode" class="text-[10px] text-cyan-500/60 mb-0.5 uppercase tracking-wider">
                    {{ msg.mode }}
                  </div>
                  <div class="text-sm text-cyan-100 whitespace-pre-wrap">
                    {{ msg.content[0]?.text }}
                  </div>
                </div>
              </div>

              <!-- System message -->
              <div v-else-if="msg.role === 'system'" class="flex justify-center">
                <div class="px-3 py-1 text-xs text-neutral-500 italic">
                  <template v-for="(block, i) in msg.content" :key="i">
                    <span v-if="block.type === 'text'">{{ block.text }}</span>
                    <!-- Tool result -->
                    <div
                      v-else-if="block.type === 'tool_result'"
                      class="text-left mt-1 px-2 py-1 bg-neutral-900 rounded text-[11px] font-mono text-neutral-400 max-h-20 overflow-y-auto"
                    >
                      {{ block.result?.slice(0, 300) }}
                    </div>
                  </template>
                </div>
              </div>

              <!-- Assistant message -->
              <div v-else class="space-y-2">
                <template v-for="(block, i) in msg.content" :key="i">
                  <!-- Text block -->
                  <div
                    v-if="block.type === 'text' && block.text"
                    class="text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed"
                  >
                    {{ block.text }}
                  </div>

                  <!-- Thinking block -->
                  <div
                    v-else-if="block.type === 'thinking' && block.thinking"
                    class="flex items-start gap-2 px-3 py-2 rounded-lg bg-violet-950/30 border border-violet-900/20"
                  >
                    <UIcon name="i-lucide-brain" class="size-3.5 text-violet-400 mt-0.5 shrink-0" />
                    <div class="text-xs text-violet-300/80 leading-relaxed">
                      {{ block.thinking.slice(0, 300) }}
                      <span v-if="block.thinking.length > 300" class="text-violet-500">...</span>
                    </div>
                  </div>

                  <!-- Tool use block -->
                  <div
                    v-else-if="block.type === 'tool_use'"
                    class="rounded-lg border border-neutral-800 overflow-hidden"
                  >
                    <button
                      class="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-neutral-900/50 transition-colors cursor-pointer"
                      @click="toggleToolExpand(block.toolCallId || `tool-${i}`)"
                    >
                      <UIcon :name="getToolIcon(block.name || '')" class="size-3.5 text-amber-400 shrink-0" />
                      <span class="text-xs font-mono text-amber-300 truncate">{{ block.name }}</span>
                      <span class="text-[10px] text-neutral-600 ml-auto">
                        {{ expandedTools.has(block.toolCallId || `tool-${i}`) ? 'collapse' : 'expand' }}
                      </span>
                      <UIcon
                        name="i-lucide-chevron-down"
                        class="size-3 text-neutral-600 transition-transform"
                        :class="{ 'rotate-180': expandedTools.has(block.toolCallId || `tool-${i}`) }"
                      />
                    </button>

                    <!-- Expanded tool details -->
                    <div
                      v-if="expandedTools.has(block.toolCallId || `tool-${i}`)"
                      class="border-t border-neutral-800 px-3 py-2 space-y-2"
                    >
                      <!-- Input -->
                      <div v-if="block.input" class="text-[11px] font-mono">
                        <div class="text-neutral-600 mb-0.5">Input:</div>
                        <pre class="text-neutral-400 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">{{ formatToolInput(block.input) }}</pre>
                      </div>
                      <!-- Result -->
                      <div v-if="findToolResult(block.toolCallId)" class="text-[11px] font-mono">
                        <div class="text-neutral-600 mb-0.5">Result:</div>
                        <pre class="text-green-400/70 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">{{ findToolResult(block.toolCallId)?.slice(0, 500) }}</pre>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>

          <!-- Legacy mode: text lines -->
          <template v-else>
            <pre
              v-for="(line, i) in legacyLines"
              :key="i"
              class="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed"
              :class="line.startsWith('[stderr]') ? 'text-red-400/70' : line.startsWith('[error]') ? 'text-red-400' : line.startsWith('>') ? 'text-cyan-300' : 'text-green-300/90'"
            >{{ line }}</pre>
          </template>

          <!-- Typing indicator -->
          <div v-if="isProcessing" class="flex items-center gap-2 text-neutral-500">
            <span class="flex gap-1">
              <span class="size-1.5 rounded-full bg-green-400 animate-bounce" style="animation-delay: 0ms" />
              <span class="size-1.5 rounded-full bg-green-400 animate-bounce" style="animation-delay: 150ms" />
              <span class="size-1.5 rounded-full bg-green-400 animate-bounce" style="animation-delay: 300ms" />
            </span>
          </div>
        </div>

        <!-- Extension UI Request -->
        <div
          v-if="pendingUIRequest"
          class="px-4 py-3 border-t border-amber-900/30 bg-amber-950/20"
        >
          <div class="text-xs text-amber-400 font-medium mb-2">
            {{ pendingUIRequest.title || 'Agent needs input' }}
          </div>
          <p v-if="pendingUIRequest.message" class="text-xs text-amber-300/70 mb-2">
            {{ pendingUIRequest.message }}
          </p>

          <!-- Select UI -->
          <div v-if="pendingUIRequest.uiType === 'select' && pendingUIRequest.options" class="space-y-1">
            <button
              v-for="opt in pendingUIRequest.options"
              :key="opt.value"
              class="block w-full text-left px-3 py-1.5 text-xs rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-200 transition-colors cursor-pointer"
              @click="handleUIResponse(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>

          <!-- Confirm UI -->
          <div v-else-if="pendingUIRequest.uiType === 'confirm'" class="flex gap-2">
            <UButton size="xs" color="primary" @click="handleUIResponse('true')">Yes</UButton>
            <UButton size="xs" color="neutral" variant="ghost" @click="handleUIResponse('false')">No</UButton>
          </div>

          <!-- Input UI -->
          <div v-else class="flex gap-2">
            <input
              :value="pendingUIRequest.defaultValue || ''"
              type="text"
              class="flex-1 bg-neutral-900 text-neutral-200 text-xs font-mono px-3 py-1.5 rounded border border-neutral-700 focus:border-amber-500 focus:outline-none"
              @keydown.enter="handleUIResponse(($event.target as HTMLInputElement).value)"
            >
            <UButton
              size="xs"
              color="primary"
              icon="i-lucide-send"
              @click="handleUIResponse(pendingUIRequest?.defaultValue || '')"
            />
          </div>
        </div>

        <!-- Input area -->
        <div class="px-4 py-3 border-t border-neutral-800">
          <div class="flex items-end gap-2">
            <textarea
              v-model="inputText"
              :placeholder="inputPlaceholder"
              rows="1"
              class="flex-1 bg-neutral-900 text-neutral-200 text-sm font-mono px-3 py-2 rounded-lg border border-neutral-700 focus:border-cyan-500 focus:outline-none placeholder-neutral-600 resize-none min-h-[38px] max-h-[120px]"
              @keydown="handleKeyDown"
              @input="($event.target as HTMLTextAreaElement).style.height = 'auto'; ($event.target as HTMLTextAreaElement).style.height = ($event.target as HTMLTextAreaElement).scrollHeight + 'px'"
            />
            <div class="flex items-center gap-1 pb-0.5">
              <UButton
                size="sm"
                :color="inputMode === 'steer' ? 'warning' : 'primary'"
                :icon="inputMode === 'steer' ? 'i-lucide-zap' : 'i-lucide-send'"
                :loading="isSending"
                :disabled="!inputText.trim() || !isConnected"
                @click="handleSend"
              />
            </div>
          </div>
          <div class="flex items-center justify-between mt-1.5">
            <span class="text-[10px] text-neutral-600 font-mono">
              {{ messages.length }} messages
              <span v-if="legacyLines.length > 0"> / {{ legacyLines.length }} lines</span>
            </span>
            <span class="text-[10px] font-mono" :class="statusColor">
              {{ inputMode === 'steer' ? 'steering' : 'prompt' }} mode
            </span>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
