/**
 * Per-session WebSocket connection to ThinkGraph.
 *
 * Opens a WebSocket to /api/teams/{id}/terminal-ws/{nodeId}?token=...&mode=rich
 * Streams terminal events from the Pi agent to ThinkGraph (which relays to browser).
 * Receives steering/abort/prompt/follow_up commands from ThinkGraph.
 */
import WebSocket from 'ws'
import type { WorkerConfig } from './config.js'

export interface SessionWsCallbacks {
  onSteer: (message: string) => void
  onAbort: () => void
  onPrompt: (text: string) => void
  onFollowUp: (text: string) => void
  onUIResponse: (requestId: string, value: string) => void
  onError: (error: Error) => void
  onClose: () => void
}

/** Structured content block for agent events */
export interface AgentContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking'
  text?: string
  name?: string
  input?: Record<string, unknown>
  result?: string
  thinking?: string
  toolCallId?: string
}

/** Structured agent message */
export interface AgentMessageEvent {
  id: string
  role: 'assistant' | 'user' | 'system'
  content: AgentContentBlock[]
  timestamp: number
}

/** Extension UI request */
export interface ExtensionUIRequest {
  requestId: string
  uiType: 'select' | 'confirm' | 'input' | 'editor' | 'notify'
  title?: string
  message?: string
  options?: Array<{ label: string; value: string }>
  defaultValue?: string
}

export class SessionWebSocket {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private closed = false
  private connected = false
  private buffer: Array<Record<string, unknown>> = []
  private mode: 'legacy' | 'rich'

  constructor(
    private config: WorkerConfig,
    private nodeId: string,
    private callbacks: SessionWsCallbacks,
    mode: 'legacy' | 'rich' = 'legacy',
  ) {
    this.mode = mode
  }

  /** Connect and return a promise that resolves when the WebSocket is open */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.thinkgraphUrl.replace(/^http/, 'ws')
      const url = `${wsUrl}/api/teams/${this.config.teamId}/terminal-ws/${this.nodeId}?token=${this.config.serviceToken}&mode=${this.mode}`

      this.ws = new WebSocket(url, {
        headers: {
          'Cookie': this.config.serviceToken,
        },
      })

      this.ws.on('open', () => {
        console.log(`[session-ws] Connected for node ${this.nodeId} (mode: ${this.mode})`)
        this.connected = true

        // Flush buffered messages
        for (const event of this.buffer) {
          this.ws!.send(JSON.stringify(event))
        }
        if (this.buffer.length > 0) {
          console.log(`[session-ws] Flushed ${this.buffer.length} buffered events for ${this.nodeId}`)
        }
        this.buffer = []

        resolve()
      })

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString())
          switch (msg.type) {
            case 'steer':
              if (msg.message) this.callbacks.onSteer(msg.message)
              break
            case 'abort':
              this.callbacks.onAbort()
              break
            case 'prompt':
              if (msg.text) this.callbacks.onPrompt(msg.text)
              break
            case 'follow_up':
              if (msg.text) this.callbacks.onFollowUp(msg.text)
              break
            case 'ui_response':
              if (msg.requestId) this.callbacks.onUIResponse(msg.requestId, msg.value || '')
              break
          }
        } catch {
          // Ignore non-JSON messages
        }
      })

      this.ws.on('error', (err) => {
        console.error(`[session-ws] Error for node ${this.nodeId}:`, err.message)
        this.callbacks.onError(err)
        if (!this.connected) reject(err)
      })

      this.ws.on('close', () => {
        console.log(`[session-ws] Closed for node ${this.nodeId}`)
        this.connected = false
        if (!this.closed) {
          // Attempt reconnect after 2s
          this.reconnectTimer = setTimeout(() => this.connect(), 2000)
        }
        this.callbacks.onClose()
      })
    })
  }

  /** Send a raw event to ThinkGraph (buffers if not yet connected) */
  private send(event: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event))
    } else if (!this.closed) {
      this.buffer.push(event)
    }
  }

  /** Send status update */
  sendStatus(status: string): void {
    this.send({ type: 'status', data: status })
  }

  /** Send terminal output line (legacy mode) */
  sendOutput(line: string): void {
    this.send({ type: 'output', data: line })
  }

  /** Send a structured agent message event (rich mode) */
  sendAgentEvent(message: AgentMessageEvent): void {
    this.send({ type: 'agent_event', data: '', event: message })
  }

  /** Send an extension UI request to the browser */
  sendUIRequest(request: ExtensionUIRequest): void {
    this.send({ type: 'ui_request', data: '', event: request })
  }

  /** Send done signal */
  sendDone(summary?: string): void {
    this.send({ type: 'done', data: summary || 'Completed' })
  }

  /** Send error signal */
  sendError(message: string): void {
    this.send({ type: 'error', data: message })
  }

  /** Close the WebSocket connection */
  close(): void {
    this.closed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
