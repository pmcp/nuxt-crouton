/**
 * Yjs client for connecting to ThinkGraph's collaboration rooms.
 *
 * Uses the collection sync signal system to detect dispatch triggers
 * in real-time (complementing the HTTP polling in dispatch-watcher).
 *
 * Also provides presence awareness — shows "Pi Worker" in the canvas.
 *
 * NOTE: This is a future enhancement. The current implementation uses
 * HTTP polling via dispatch-watcher.ts. Yjs client will be added once
 * the Durable Object WebSocket protocol compatibility is verified.
 */
import WebSocket from 'ws'
import * as Y from 'yjs'
import type { WorkerConfig } from './config.js'

export class YjsClient {
  private ws: WebSocket | null = null
  private doc: Y.Doc
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private connected = false

  constructor(
    private config: WorkerConfig,
    private onCollectionChanged?: (collection: string, version: number) => void,
  ) {
    this.doc = new Y.Doc()
  }

  /** Connect to the team's sync room */
  connect(): void {
    const wsUrl = this.config.thinkgraphUrl.replace(/^http/, 'ws')
    const roomId = `team:${this.config.teamId}:sync`
    const url = `${wsUrl}/api/collab/${roomId}/ws?type=sync&teamId=${this.config.teamId}`

    console.log(`[yjs-client] Connecting to sync room: ${roomId}`)

    this.ws = new WebSocket(url, {
      headers: {
        // Forward auth cookie or service token
        'Cookie': `better_auth_session=${this.config.serviceToken}`,
      },
    })

    this.ws.binaryType = 'arraybuffer'

    this.ws.on('open', () => {
      this.connected = true
      console.log('[yjs-client] Connected to sync room')

      // Send presence awareness
      this.sendAwareness()
    })

    this.ws.on('message', (data) => {
      if (data instanceof ArrayBuffer) {
        // Binary Yjs update
        const update = new Uint8Array(data)
        // Check if it's JSON
        if (update[0] === 123 || update[0] === 91) {
          this.handleJsonMessage(new TextDecoder().decode(update))
        } else {
          Y.applyUpdate(this.doc, update)
        }
      } else if (typeof data === 'string') {
        this.handleJsonMessage(data)
      }
    })

    this.ws.on('close', () => {
      this.connected = false
      console.log('[yjs-client] Disconnected from sync room')
      // Reconnect after 5s
      this.reconnectTimer = setTimeout(() => this.connect(), 5000)
    })

    this.ws.on('error', (err) => {
      console.error('[yjs-client] WebSocket error:', err.message)
    })

    // Watch the versions map for changes
    const versionsMap = this.doc.getMap<number>('versions')
    versionsMap.observe((event) => {
      if (event.transaction.origin === 'remote' || event.transaction.origin === null) {
        for (const [collection, change] of event.changes.keys) {
          if (change.action === 'update' || change.action === 'add') {
            const version = versionsMap.get(collection)
            if (version !== undefined && this.onCollectionChanged) {
              this.onCollectionChanged(collection, version)
            }
          }
        }
      }
    })
  }

  private handleJsonMessage(text: string): void {
    try {
      const msg = JSON.parse(text)
      if (msg.type === 'pong') return
      // Handle awareness messages if needed
    } catch {}
  }

  private sendAwareness(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({
      type: 'awareness',
      userId: 'pi-worker',
      state: {
        user: {
          id: 'pi-worker',
          name: 'Pi Worker',
          color: '#10b981', // Green
        },
        cursor: null,
        selection: null,
      },
    }))
  }

  /** Disconnect from the sync room */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connected = false
  }

  get isConnected(): boolean {
    return this.connected
  }
}
