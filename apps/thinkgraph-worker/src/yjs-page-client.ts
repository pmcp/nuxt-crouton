/**
 * Yjs page room client for the Pi worker.
 *
 * Connects directly to a CollabRoom Durable Object running in `page` mode and
 * appends content into the per-node TipTap editor's `Y.XmlFragment('content')`.
 * This is the Pi worker's hook into the Notion-style block editor that PR 1 of
 * the slideover series shipped — instead of writing opaque text into
 * `node.output`, Pi can append real blocks (paragraphs, action buttons) into
 * the same Yjs fragment that any open browser editor is bound to.
 *
 * Mirrors the WebSocket lifecycle from YjsFlowClient (auth, reconnect, ping
 * keepalive, dev-vs-collab-worker URL switch) but operates on a `Y.XmlFragment`
 * rather than a `Y.Map<YjsFlowNode>`. The CollabRoom DO is structure-agnostic
 * — page rooms accept binary updates without server-side schema enforcement,
 * so any TipTap node type (including the new `actionButton`) round-trips fine.
 *
 * Wire protocol matches CollabRoom DO:
 * - Binary messages: Yjs updates (Uint8Array)
 * - JSON messages: awareness, ping/pong
 */
import WebSocket from 'ws'
import * as Y from 'yjs'
import { createHmac } from 'node:crypto'
import type { WorkerConfig } from './config.js'

export interface ActionButtonInsert {
  /** Visible button label, e.g. "Create child node" */
  label: string
  /** Lucide icon name, e.g. "i-lucide-plus" */
  icon?: string
  /** Action kind — looked up in the browser's useNodeActionHandlers registry */
  kind: string
  /** Arbitrary payload passed to the handler when the button is clicked */
  payload?: Record<string, unknown>
}

export interface FileDiffInsert {
  /** Path of the file the diff applies to, used as the panel header. */
  filePath: string
  /** Unified diff text — standard +/−/@@ prefixes. Newlines preserved verbatim. */
  diff: string
  /** Optional language hint for the browser to render a badge / pick a highlighter. */
  language?: string
  /** Initial collapsed state. Defaults to false. */
  collapsed?: boolean
}

// ── Comment thread types (PR 3) ────────────────────────────
//
// Comment threads live in a Y.Map<CommentThread> on the same Y.Doc as the
// editor's Y.XmlFragment. Threads are stored as plain JS objects (not nested
// Y types) because Y.Map.set serialises values as JSON updates — appending a
// message replaces the whole entry. Append-only semantics + 1-user-1-Pi
// concurrency in practice means last-write-wins is acceptable for v1.

export type CommentAuthor = 'human' | 'pi'

export interface CommentMessage {
  id: string
  /** Coarse author kind. Display label is derived from this on the browser. */
  author: CommentAuthor
  /** Optional human-readable label, e.g. "Pi", "Alice". Falls back to author kind. */
  authorLabel?: string
  body: string
  createdAt: number
}

export interface CommentAnchor {
  /** Verbatim quote of the editor text the thread is anchored to. */
  quote: string
  /**
   * Which match of `quote` to anchor to (0-indexed). Defaults to 0 — the first
   * occurrence wins. Pi should pick distinctive quotes to avoid ambiguity.
   */
  occurrence?: number
}

export interface CommentThread {
  id: string
  anchor: CommentAnchor
  status: 'open' | 'resolved'
  createdAt: number
  createdBy: CommentAuthor
  messages: CommentMessage[]
}

export interface YjsPageClientOptions {
  config: WorkerConfig
  /** Team id used in the room name and the team membership query param */
  teamId: string
  /** Node id this client edits the page room for */
  nodeId: string
}

export class YjsPageClient {
  private ws: WebSocket | null = null
  private doc: Y.Doc
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private connected = false
  private synced = false
  private syncResolvers: Array<() => void> = []
  private intentionalClose = false

  private readonly config: WorkerConfig
  private readonly teamId: string
  private readonly nodeId: string
  private readonly roomId: string
  private readonly roomType = 'page'
  private readonly fragmentName = 'content'
  private readonly commentsMapName = 'comments'

  constructor(options: YjsPageClientOptions) {
    this.config = options.config
    this.teamId = options.teamId
    this.nodeId = options.nodeId
    this.roomId = `thinkgraph-node-${options.teamId}-${options.nodeId}`
    this.doc = new Y.Doc()
  }

  /** The Y.XmlFragment that holds the editor content — same as the browser's `useCollabEditor` */
  get fragment(): Y.XmlFragment {
    return this.doc.getXmlFragment(this.fragmentName)
  }

  /**
   * Y.Map storage for comment threads (PR 3). Lives on the same Y.Doc as the
   * editor fragment, so a single page room round-trips both content and
   * discussion. Browser uses the same map name in `useNodeComments`.
   */
  get commentsMap(): Y.Map<CommentThread> {
    return this.doc.getMap<CommentThread>(this.commentsMapName)
  }

  get isConnected(): boolean {
    return this.connected
  }

  get isSynced(): boolean {
    return this.synced
  }

  // ── Connection ──────────────────────────────────────────────

  /**
   * Connect to the page room.
   * Resolves once the initial Yjs state is synced (so subsequent appends apply
   * on top of the canonical room state instead of clobbering it).
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.intentionalClose = false
      const url = this.buildWsUrl()

      console.log(`[yjs-page] Connecting to page room: ${this.roomId}`)

      this.ws = new WebSocket(url, { headers: this.buildHeaders() })
      this.ws.binaryType = 'arraybuffer'

      let resolved = false

      this.ws.on('open', () => {
        this.connected = true
        console.log('[yjs-page] Connected')

        this.pingTimer = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 25_000)
      })

      this.ws.on('message', (data) => {
        let bytes: Uint8Array | null = null
        if (data instanceof ArrayBuffer) {
          bytes = new Uint8Array(data)
        } else if (Buffer.isBuffer(data)) {
          bytes = new Uint8Array(data)
        } else if (typeof data === 'string') {
          this.handleJsonMessage(data)
          return
        }

        if (!bytes) return

        // JSON messages (awareness, pong) arrive as binary too
        if (bytes[0] === 123 || bytes[0] === 91) {
          this.handleJsonMessage(new TextDecoder().decode(bytes))
          return
        }

        // Binary Yjs update
        if (!this.synced) {
          Y.applyUpdate(this.doc, bytes, 'remote')
          this.synced = true
          console.log(`[yjs-page] Synced — ${this.fragment.length} top-level nodes in room`)
          if (!resolved) {
            resolved = true
            resolve()
          }
          // Drain any callers waiting on awaitSynced
          for (const fn of this.syncResolvers.splice(0)) fn()
          return
        }

        Y.applyUpdate(this.doc, bytes, 'remote')
      })

      this.ws.on('close', () => {
        this.connected = false
        this.synced = false
        this.clearPing()
        console.log('[yjs-page] Disconnected')

        if (!resolved) {
          resolved = true
          reject(new Error('WebSocket closed before sync'))
        }

        if (!this.intentionalClose) {
          this.reconnectTimer = setTimeout(() => this.connect().catch(() => {}), 5000)
        }
      })

      this.ws.on('error', (err) => {
        console.error('[yjs-page] WebSocket error:', err.message)
        if (!resolved) {
          resolved = true
          reject(err)
        }
      })

      // Broadcast local Yjs changes to the server
      this.doc.on('update', (update: Uint8Array, origin: unknown) => {
        if (origin === 'remote') return
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(update)
        }
      })
    })
  }

  /** Resolve once the room has synced (no-op if already synced). */
  awaitSynced(): Promise<void> {
    if (this.synced) return Promise.resolve()
    return new Promise<void>((resolve) => {
      this.syncResolvers.push(resolve)
    })
  }

  disconnect(): void {
    this.intentionalClose = true
    this.clearPing()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connected = false
    this.synced = false
  }

  // ── Block append operations ─────────────────────────────────

  /**
   * Append a paragraph block at the end of the editor content.
   * y-prosemirror maps `<paragraph>text</paragraph>` to a Y.XmlElement named
   * `paragraph` containing a single Y.XmlText with the prose.
   */
  appendParagraph(text: string): void {
    const paragraph = new Y.XmlElement('paragraph')
    const xmlText = new Y.XmlText()
    xmlText.insert(0, text)
    paragraph.insert(0, [xmlText])
    this.fragment.insert(this.fragment.length, [paragraph])
  }

  /**
   * Append an inert action button block at the end of the editor content.
   * Buttons are leaf TipTap nodes — no inner content, all data lives on attrs.
   * The browser's TipTap extension parses these attributes back into the
   * NodeView component which renders the button and dispatches clicks.
   */
  appendActionButton(button: ActionButtonInsert): void {
    const node = new Y.XmlElement('actionButton')
    node.setAttribute('label', button.label)
    if (button.icon) node.setAttribute('icon', button.icon)
    node.setAttribute('kind', button.kind)
    // Y.XmlElement attributes must be strings — payload is JSON-encoded and
    // parsed back to an object on the browser side.
    node.setAttribute('payload', JSON.stringify(button.payload ?? {}))
    node.setAttribute('consumed', 'false')
    this.fragment.insert(this.fragment.length, [node])
  }

  /**
   * Append a read-only file-diff block at the end of the editor content.
   * Like action buttons, file diffs are leaf TipTap nodes — no inner content,
   * all data lives on string attributes. The browser's `fileDiff` extension
   * parses these attributes back into the FileDiffBlock NodeView which renders
   * the unified diff with +/− line coloring.
   *
   * Note on size: the `diff` string can be kilobytes for large changes. Y.Xml
   * attribute storage handles arbitrary-length strings fine (it's just a string
   * value in the Yjs update stream), so the diff is passed verbatim without
   * chunking or base64 encoding.
   */
  appendFileDiff(fileDiff: FileDiffInsert): void {
    const node = new Y.XmlElement('fileDiff')
    node.setAttribute('filePath', fileDiff.filePath)
    node.setAttribute('diff', fileDiff.diff)
    node.setAttribute('language', fileDiff.language ?? '')
    // Yjs attributes are string-only; encode the boolean as 'true'/'false'.
    node.setAttribute('collapsed', fileDiff.collapsed ? 'true' : 'false')
    this.fragment.insert(this.fragment.length, [node])
  }

  // ── Comment thread operations (PR 3) ─────────────────────

  /**
   * Open a new comment thread anchored to a quoted snippet.
   *
   * The thread is stored in `commentsMap` keyed by `threadId`. The browser's
   * `useNodeComments` observer fires within the next Yjs update cycle and
   * applies the visual `commentAnchor` mark to the matching range.
   *
   * Returns the threadId for the caller's records.
   */
  openComment(
    threadId: string,
    anchor: CommentAnchor,
    message: { body: string; author?: CommentAuthor; authorLabel?: string },
  ): string {
    const author: CommentAuthor = message.author ?? 'pi'
    const now = Date.now()
    const thread: CommentThread = {
      id: threadId,
      anchor: {
        quote: anchor.quote,
        occurrence: anchor.occurrence ?? 0,
      },
      status: 'open',
      createdAt: now,
      createdBy: author,
      messages: [
        {
          id: `${threadId}-m0`,
          author,
          authorLabel: message.authorLabel,
          body: message.body,
          createdAt: now,
        },
      ],
    }
    this.commentsMap.set(threadId, thread)
    return threadId
  }

  /**
   * Append a message to an existing thread. No-ops if the thread doesn't
   * exist (caller can check the return value to detect that case).
   *
   * Concurrency note: two writers replying to the same thread at the same
   * instant will collide on a Y.Map.set — last write wins, the loser's
   * message is dropped. Acceptable for v1 (1 user + Pi typical case).
   */
  replyToComment(
    threadId: string,
    message: { body: string; author?: CommentAuthor; authorLabel?: string },
  ): boolean {
    const existing = this.commentsMap.get(threadId)
    if (!existing) return false
    const author: CommentAuthor = message.author ?? 'pi'
    const next: CommentThread = {
      ...existing,
      messages: [
        ...existing.messages,
        {
          id: `${threadId}-m${existing.messages.length}`,
          author,
          authorLabel: message.authorLabel,
          body: message.body,
          createdAt: Date.now(),
        },
      ],
    }
    this.commentsMap.set(threadId, next)
    return true
  }

  /** Mark a thread as resolved. Idempotent; no-op if already resolved or missing. */
  resolveComment(threadId: string): boolean {
    const existing = this.commentsMap.get(threadId)
    if (!existing) return false
    if (existing.status === 'resolved') return true
    this.commentsMap.set(threadId, { ...existing, status: 'resolved' })
    return true
  }

  // ── Private ──────────────────────────────────────────────

  private buildWsUrl(): string {
    const { collabWorkerUrl, thinkgraphUrl } = this.config

    const params = new URLSearchParams({
      type: this.roomType,
      roomId: this.roomId,
      teamId: this.teamId,
    })

    if (collabWorkerUrl) {
      // Production: connect directly to the collab worker
      const roomKey = encodeURIComponent(`${this.roomType}:${this.roomId}`)
      const wsUrl = collabWorkerUrl.replace(/^https?:/, 'wss:')

      const token = this.generateCollabToken()
      if (token) {
        params.set('token', token)
      }

      return `${wsUrl}/${roomKey}/ws?${params.toString()}`
    }

    // Dev: connect to same-origin Nitro crossws handler
    const wsUrl = thinkgraphUrl.replace(/^http/, 'ws')
    return `${wsUrl}/api/collab/${this.roomId}/ws?${params.toString()}`
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (!this.config.collabWorkerUrl && this.config.serviceToken) {
      headers['Cookie'] = this.config.serviceToken
    }
    return headers
  }

  /**
   * Generate an HMAC-signed collab token — mirrors /api/collab/token.get.ts
   * Token format: base64(JSON payload).base64(HMAC signature)
   */
  private generateCollabToken(): string | null {
    const secret = this.config.betterAuthSecret
    if (!secret) return null

    const payload = JSON.stringify({
      userId: 'pi-agent',
      exp: Date.now() + 60_000,
    })

    const payloadB64 = Buffer.from(payload).toString('base64')
    const signature = createHmac('sha256', secret)
      .update(payload)
      .digest('base64')

    return `${payloadB64}.${signature}`
  }

  private handleJsonMessage(text: string): void {
    try {
      const msg = JSON.parse(text)
      if (msg.type === 'pong') return
      // Awareness broadcasts from other users — page client doesn't need them
    } catch {
      // Ignore non-JSON
    }
  }

  private clearPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }
}
