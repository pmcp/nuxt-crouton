/**
 * Per-session WebSocket connection to ThinkGraph.
 *
 * Opens a WebSocket to /api/teams/{id}/terminal-ws/{nodeId}?token=...
 * Streams terminal events from the Pi agent to ThinkGraph (which relays to browser SSE).
 * Receives steering/abort commands from ThinkGraph.
 */
import WebSocket from 'ws'
import type { WorkerConfig } from './config.js'

export interface SessionWsCallbacks {
  onSteer: (message: string) => void
  onAbort: () => void
  onError: (error: Error) => void
  onClose: () => void
}

export class SessionWebSocket {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private closed = false
  private connected = false
  private buffer: Array<{ type: string; data: string }> = []

  constructor(
    private config: WorkerConfig,
    private nodeId: string,
    private callbacks: SessionWsCallbacks,
  ) {}

  /** Connect and return a promise that resolves when the WebSocket is open */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.thinkgraphUrl.replace(/^http/, 'ws')
      const url = `${wsUrl}/api/teams/${this.config.teamId}/terminal-ws/${this.nodeId}?token=${this.config.serviceToken}`

      this.ws = new WebSocket(url, {
        headers: {
          'Cookie': this.config.serviceToken,
        },
      })

      this.ws.on('open', () => {
        console.log(`[session-ws] Connected for node ${this.nodeId}`)
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
          if (msg.type === 'steer' && msg.message) {
            this.callbacks.onSteer(msg.message)
          } else if (msg.type === 'abort') {
            this.callbacks.onAbort()
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

  /** Send a terminal event to ThinkGraph (buffers if not yet connected) */
  send(event: { type: string; data: string }): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event))
    } else if (!this.closed) {
      // Buffer events until connected
      this.buffer.push(event)
    }
  }

  /** Send status update */
  sendStatus(status: string): void {
    this.send({ type: 'status', data: status })
  }

  /** Send terminal output line */
  sendOutput(line: string): void {
    this.send({ type: 'output', data: line })
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
