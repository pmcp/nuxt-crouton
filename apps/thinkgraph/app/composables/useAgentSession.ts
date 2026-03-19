/**
 * Manages a WebSocket connection for rich Pi agent sessions.
 *
 * Provides structured event history (messages, tool calls, thinking),
 * handles sending prompts/steers/follow-ups, manages session state.
 */
import type { Ref } from 'vue'

/** Content block within an agent message */
export interface AgentContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking'
  text?: string
  name?: string
  input?: Record<string, unknown>
  result?: string
  thinking?: string
  toolCallId?: string
}

/** A structured message in the agent session */
export interface AgentMessage {
  id: string
  role: 'assistant' | 'user' | 'system'
  content: AgentContentBlock[]
  timestamp: number
  mode?: 'prompt' | 'steer' | 'follow_up'
}

/** Extension UI request from the agent */
export interface ExtensionUIRequest {
  requestId: string
  uiType: 'select' | 'confirm' | 'input' | 'editor' | 'notify'
  title?: string
  message?: string
  options?: Array<{ label: string; value: string }>
  defaultValue?: string
}

export type SessionStatus = 'idle' | 'thinking' | 'working' | 'done' | 'error' | 'waiting_input' | 'disconnected'
export type SessionMode = 'legacy' | 'rich'

export function useAgentSession(nodeId: Ref<string | null>, teamId: Ref<string | undefined>) {
  const messages = ref<AgentMessage[]>([])
  const legacyLines = ref<string[]>([])
  const status = ref<SessionStatus>('idle')
  const sessionMode = ref<SessionMode>('rich')
  const pendingUIRequest = ref<ExtensionUIRequest | null>(null)
  const isConnected = ref(false)

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function connect() {
    if (!nodeId.value || !teamId.value) return
    disconnect()

    messages.value = []
    legacyLines.value = []
    status.value = 'thinking'
    pendingUIRequest.value = null

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/api/teams/${teamId.value}/terminal-ws/${nodeId.value}`
    ws = new WebSocket(url)

    ws.onopen = () => {
      isConnected.value = true
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleEvent(data)
      } catch {}
    }

    ws.onclose = () => {
      isConnected.value = false
      if (status.value === 'thinking' || status.value === 'working' || status.value === 'idle') {
        // Reconnect if session might still be active
        reconnectTimer = setTimeout(() => connect(), 2000)
      } else {
        status.value = 'disconnected'
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
    isConnected.value = false
  }

  function handleEvent(data: any) {
    switch (data.type) {
      case 'session_mode':
        sessionMode.value = data.data as SessionMode
        break

      case 'status':
        status.value = data.data as SessionStatus
        break

      case 'output':
        legacyLines.value.push(data.data)
        if (legacyLines.value.length > 500) {
          legacyLines.value.splice(0, legacyLines.value.length - 500)
        }
        break

      case 'agent_event': {
        if (data.event && 'role' in data.event) {
          const msg = data.event as AgentMessage
          // Merge consecutive assistant message_update events
          const last = messages.value[messages.value.length - 1]
          if (last && last.role === 'assistant' && msg.role === 'assistant' && !isToolResult(msg)) {
            // Append content blocks to the last assistant message
            last.content.push(...msg.content)
            // Trigger reactivity
            messages.value = [...messages.value]
          } else {
            messages.value.push(msg)
          }
        }
        break
      }

      case 'user_message': {
        if (data.event && 'role' in data.event) {
          messages.value.push(data.event as AgentMessage)
        }
        break
      }

      case 'ui_request': {
        if (data.event) {
          pendingUIRequest.value = data.event as ExtensionUIRequest
          status.value = 'waiting_input'
        }
        break
      }

      case 'done':
        status.value = 'done'
        messages.value.push({
          id: `sys-${Date.now()}`,
          role: 'system',
          content: [{ type: 'text', text: data.data || 'Session completed' }],
          timestamp: Date.now(),
        })
        break

      case 'error':
        status.value = 'error'
        if (data.data && data.data !== 'No active session') {
          messages.value.push({
            id: `sys-${Date.now()}`,
            role: 'system',
            content: [{ type: 'text', text: `Error: ${data.data}` }],
            timestamp: Date.now(),
          })
        }
        break
    }
  }

  function isToolResult(msg: AgentMessage): boolean {
    return msg.content.length === 1 && msg.content[0].type === 'tool_result'
  }

  // ─── Send commands ───

  function sendPrompt(text: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN || !text.trim()) return
    ws.send(JSON.stringify({ type: 'prompt', text }))
  }

  function sendSteer(text: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN || !text.trim()) return
    ws.send(JSON.stringify({ type: 'steer', message: text }))
  }

  function sendFollowUp(text: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN || !text.trim()) return
    ws.send(JSON.stringify({ type: 'follow_up', text }))
  }

  function sendAbort() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'abort' }))
  }

  function sendUIResponse(requestId: string, value: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'ui_response', requestId, value }))
    pendingUIRequest.value = null
    status.value = 'working'
  }

  /** Send a message — auto-detects the right mode based on session state */
  function send(text: string) {
    if (status.value === 'working' || status.value === 'thinking') {
      sendSteer(text)
    } else {
      sendPrompt(text)
    }
  }

  // ─── Computed helpers ───

  const isActive = computed(() =>
    status.value === 'thinking' || status.value === 'working' || status.value === 'idle' || status.value === 'waiting_input',
  )

  const isProcessing = computed(() =>
    status.value === 'thinking' || status.value === 'working',
  )

  const canSendPrompt = computed(() =>
    isConnected.value && (status.value === 'idle' || status.value === 'done'),
  )

  const statusLabel = computed(() => {
    switch (status.value) {
      case 'thinking': return 'Thinking...'
      case 'working': return 'Working...'
      case 'idle': return 'Ready'
      case 'done': return 'Done'
      case 'error': return 'Error'
      case 'waiting_input': return 'Waiting for input'
      case 'disconnected': return 'Disconnected'
      default: return 'Idle'
    }
  })

  const statusColor = computed(() => {
    switch (status.value) {
      case 'thinking': return 'text-blue-400'
      case 'working': return 'text-green-400'
      case 'idle': return 'text-cyan-400'
      case 'done': return 'text-green-500'
      case 'error': return 'text-red-400'
      case 'waiting_input': return 'text-amber-400'
      case 'disconnected': return 'text-neutral-500'
      default: return 'text-neutral-400'
    }
  })

  // ─── Lifecycle ───

  onUnmounted(() => disconnect())

  return {
    // State
    messages,
    legacyLines,
    status,
    sessionMode,
    pendingUIRequest,
    isConnected,

    // Computed
    isActive,
    isProcessing,
    canSendPrompt,
    statusLabel,
    statusColor,

    // Actions
    connect,
    disconnect,
    send,
    sendPrompt,
    sendSteer,
    sendFollowUp,
    sendAbort,
    sendUIResponse,
  }
}
