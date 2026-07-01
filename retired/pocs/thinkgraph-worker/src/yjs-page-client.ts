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
    // High-range random clientID so the Pi worker wins concurrent Y.Map.set
    // conflicts with browser writers.
    //
    // Why this matters: Y.Map.set replaces the whole entry — when two
    // clients concurrently write to the same key, Yjs resolves the
    // conflict deterministically via a clientID tiebreak (higher wins).
    // In PR 5's comment-reply flow, the browser writes the human reply to
    // commentsMap[threadId] while the Pi worker, in parallel, writes its
    // own reply to the same key. If the browser wins the conflict, Pi's
    // reply is discarded; if Pi wins, the browser's human message is
    // discarded. Neither is acceptable.
    //
    // The fix is layered: session-manager pre-writes the human message
    // into the Pi worker's local Y.Map before running Pi, so the worker's
    // write always contains both the human message AND Pi's reply. Then
    // biasing the worker's clientID high ensures the worker wins the
    // concurrent conflict, preserving the full `[...human, ...pi]` state.
    //
    // Browser clientIDs are uniform random across uint32. Our range is
    // 0x7FF00000–0x7FFFFFFF (top ~0.05% of the space), so we win ~99.95%
    // of concurrent conflicts. Not perfect — a proper fix would migrate
    // CommentThread.messages to a Y.Array for CRDT-native append merging
    // — but good enough to close the observed failure mode until the
    // schema refactor.
    const clientID = 0x7FF00000 + Math.floor(Math.random() * 0x000FFFFF)
    this.doc = new Y.Doc()
    // Y.Doc's DocOpts type doesn't expose clientID as a constructor option,
    // but the instance property is writable — assign it immediately after
    // construction, before any operations are recorded against the doc so
    // they all carry the high clientID.
    this.doc.clientID = clientID
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
   *
   * This is the raw-text primitive — it writes the string verbatim with no
   * markdown interpretation. Most callers should use `appendMarkdown` instead,
   * which parses headings, bold/italic, lists, code blocks, etc. into proper
   * TipTap nodes. `appendParagraph` is still useful for cases where the
   * caller knows the content is plain text and wants to avoid parser
   * surprises (e.g. strings containing literal `*` or `#` characters).
   */
  appendParagraph(text: string): void {
    const paragraph = new Y.XmlElement('paragraph')
    const xmlText = new Y.XmlText()
    xmlText.insert(0, text)
    paragraph.insert(0, [xmlText])
    this.fragment.insert(this.fragment.length, [paragraph])
  }

  /**
   * Append one or more blocks parsed from a markdown string.
   *
   * Why this exists: Pi's default output style is markdown (# headings,
   * **bold**, `- lists`, fenced code blocks). The old `appendParagraph` wrote
   * these as literal text, so `**Finding:**` would land in the editor as
   * five asterisks instead of a bold run. This method parses the markdown
   * with a minimal hand-rolled parser (no new dependency) and emits the
   * resulting blocks as Y.XmlElements matching the TipTap StarterKit schema:
   *
   *   - `# heading` → `<heading level="1">`
   *   - `**bold**` → inline `{ bold: true }` format on Y.XmlText
   *   - `*italic*` / `_italic_` → `{ italic: true }`
   *   - `` `code` `` → `{ code: true }`
   *   - `~~strike~~` → `{ strike: true }`
   *   - `- item` / `* item` → `<bulletList><listItem><paragraph>`
   *   - `1. item` → `<orderedList><listItem><paragraph>`
   *   - `> quote` → `<blockquote>` (recursively parsed)
   *   - ``` ```lang\ncode\n``` ``` → `<codeBlock language="lang">`
   *   - `---` / `***` → `<horizontalRule>`
   *   - blank-line-separated → separate paragraph blocks
   *
   * Edge cases it does NOT handle (acceptable v1 trade-offs):
   *   - Nested marks across mark boundaries (`**bold *italic*** bold`) — the
   *     inline tokenizer toggles flags, so ambiguous cases may produce
   *     unexpected runs. Pi rarely nests marks.
   *   - Setext-style headings (`text\n===`) — use ATX (`# text`) instead.
   *     Pi's default is ATX.
   *   - Reference-style links, tables, images, HTML passthrough — not in the
   *     TipTap StarterKit schema anyway.
   *   - Hard line breaks within a paragraph — consecutive non-blank lines
   *     are joined with a space.
   *
   * The raw `appendParagraph` stays available for plain-text insertion.
   */
  appendMarkdown(markdown: string): void {
    const blocks = parseMarkdownBlocks(markdown)
    const elements = blocks.map(blockToXmlElement)
    if (elements.length === 0) return
    this.fragment.insert(this.fragment.length, elements)
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

// ── Markdown → TipTap Y.Xml node parser ───────────────────────
//
// Minimal hand-rolled parser scoped to the markdown subset Pi typically
// emits and the TipTap StarterKit nodes the browser editor renders. Lives
// in this file (not a separate module) because it's an implementation
// detail of `appendMarkdown` and nothing else needs it.

interface InlineMarks {
  bold?: true
  italic?: true
  code?: true
  strike?: true
}

interface InlineRun {
  text: string
  marks: InlineMarks
}

type MdBlock =
  | { type: 'paragraph'; runs: InlineRun[] }
  | { type: 'heading'; level: number; runs: InlineRun[] }
  | { type: 'codeBlock'; code: string; language?: string }
  | { type: 'bulletList'; items: MdBlock[][] }
  | { type: 'orderedList'; items: MdBlock[][] }
  | { type: 'blockquote'; children: MdBlock[] }
  | { type: 'horizontalRule' }

const BULLET_RE = /^[-*+]\s+/
const ORDERED_RE = /^\d+\.\s+/
const HEADING_RE = /^(#{1,6})\s+(.*)$/
const HR_RE = /^(---|\*\*\*|___)\s*$/
const FENCE_RE = /^```\s*(\S*)\s*$/
const QUOTE_RE = /^>\s?/

function parseMarkdownBlocks(markdown: string): MdBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: MdBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Blank line — paragraph separator
    if (line.trim() === '') {
      i++
      continue
    }

    // Fenced code block
    const fenceMatch = line.match(FENCE_RE)
    if (fenceMatch) {
      const language = fenceMatch[1] || ''
      const codeLines: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // consume closing fence
      blocks.push({ type: 'codeBlock', code: codeLines.join('\n'), language })
      continue
    }

    // Horizontal rule
    if (HR_RE.test(line)) {
      blocks.push({ type: 'horizontalRule' })
      i++
      continue
    }

    // ATX heading
    const headingMatch = line.match(HEADING_RE)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        runs: parseInline(headingMatch[2]),
      })
      i++
      continue
    }

    // Bullet list
    if (BULLET_RE.test(line)) {
      const items: MdBlock[][] = []
      while (i < lines.length && BULLET_RE.test(lines[i])) {
        const itemText = lines[i].replace(BULLET_RE, '')
        items.push([{ type: 'paragraph', runs: parseInline(itemText) }])
        i++
      }
      blocks.push({ type: 'bulletList', items })
      continue
    }

    // Ordered list
    if (ORDERED_RE.test(line)) {
      const items: MdBlock[][] = []
      while (i < lines.length && ORDERED_RE.test(lines[i])) {
        const itemText = lines[i].replace(ORDERED_RE, '')
        items.push([{ type: 'paragraph', runs: parseInline(itemText) }])
        i++
      }
      blocks.push({ type: 'orderedList', items })
      continue
    }

    // Blockquote — collect contiguous `> ` lines and recurse
    if (QUOTE_RE.test(line)) {
      const quoteLines: string[] = []
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        quoteLines.push(lines[i].replace(QUOTE_RE, ''))
        i++
      }
      blocks.push({
        type: 'blockquote',
        children: parseMarkdownBlocks(quoteLines.join('\n')),
      })
      continue
    }

    // Paragraph — gather consecutive non-blank, non-special lines
    const paraLines: string[] = [line]
    i++
    while (i < lines.length) {
      const next = lines[i]
      if (next.trim() === '') break
      if (
        HEADING_RE.test(next) ||
        FENCE_RE.test(next) ||
        HR_RE.test(next) ||
        BULLET_RE.test(next) ||
        ORDERED_RE.test(next) ||
        QUOTE_RE.test(next)
      ) break
      paraLines.push(next)
      i++
    }
    blocks.push({ type: 'paragraph', runs: parseInline(paraLines.join(' ')) })
  }

  return blocks
}

/**
 * Inline tokenizer. Toggles bold/italic/strike marks on open/close markers
 * and treats `` ` `` as a non-parseable code span. Simple toggle model —
 * doesn't try to track paired open/close, so truly malformed input (a lone
 * `**` with no closer) will turn everything after it bold. Acceptable for
 * Pi-generated output which is usually well-formed.
 */
function parseInline(text: string): InlineRun[] {
  const runs: InlineRun[] = []
  const marks: InlineMarks = {}
  let current = ''

  function flush() {
    if (current) {
      runs.push({ text: current, marks: { ...marks } })
      current = ''
    }
  }

  let i = 0
  while (i < text.length) {
    const ch = text[i]
    const next = text[i + 1]

    // Inline code — highest precedence, no nested parsing
    if (ch === '`') {
      flush()
      const end = text.indexOf('`', i + 1)
      if (end === -1) {
        current += ch
        i++
      } else {
        runs.push({ text: text.slice(i + 1, end), marks: { code: true } })
        i = end + 1
      }
      continue
    }

    // Strikethrough ~~...~~
    if (ch === '~' && next === '~') {
      flush()
      if (marks.strike) delete marks.strike
      else marks.strike = true
      i += 2
      continue
    }

    // Bold **...** or __...__
    if ((ch === '*' && next === '*') || (ch === '_' && next === '_')) {
      flush()
      if (marks.bold) delete marks.bold
      else marks.bold = true
      i += 2
      continue
    }

    // Italic *...* or _..._
    if (ch === '*' || ch === '_') {
      flush()
      if (marks.italic) delete marks.italic
      else marks.italic = true
      i++
      continue
    }

    current += ch
    i++
  }

  flush()
  return runs
}

function blockToXmlElement(block: MdBlock): Y.XmlElement {
  switch (block.type) {
    case 'paragraph': {
      const el = new Y.XmlElement('paragraph')
      const xmlText = runsToXmlText(block.runs)
      if (xmlText) el.insert(0, [xmlText])
      return el
    }
    case 'heading': {
      const el = new Y.XmlElement('heading')
      el.setAttribute('level', String(block.level))
      const xmlText = runsToXmlText(block.runs)
      if (xmlText) el.insert(0, [xmlText])
      return el
    }
    case 'codeBlock': {
      const el = new Y.XmlElement('codeBlock')
      if (block.language) el.setAttribute('language', block.language)
      const xmlText = new Y.XmlText()
      xmlText.insert(0, block.code)
      el.insert(0, [xmlText])
      return el
    }
    case 'horizontalRule': {
      return new Y.XmlElement('horizontalRule')
    }
    case 'blockquote': {
      const el = new Y.XmlElement('blockquote')
      if (block.children.length > 0) {
        el.insert(0, block.children.map(blockToXmlElement))
      }
      return el
    }
    case 'bulletList':
    case 'orderedList': {
      const el = new Y.XmlElement(block.type)
      el.insert(
        0,
        block.items.map((itemBlocks) => {
          const li = new Y.XmlElement('listItem')
          li.insert(0, itemBlocks.map(blockToXmlElement))
          return li
        }),
      )
      return el
    }
  }
}

/**
 * Collapse an array of inline runs into a single Y.XmlText with y-prosemirror
 * format attributes for marks. Returns null if the runs are empty — caller
 * should skip inserting a child in that case.
 */
function runsToXmlText(runs: InlineRun[]): Y.XmlText | null {
  if (runs.length === 0) return null
  const xmlText = new Y.XmlText()
  let pos = 0
  for (const run of runs) {
    if (!run.text) continue
    const attrs: Record<string, true> = {}
    if (run.marks.bold) attrs.bold = true
    if (run.marks.italic) attrs.italic = true
    if (run.marks.code) attrs.code = true
    if (run.marks.strike) attrs.strike = true
    if (Object.keys(attrs).length > 0) {
      xmlText.insert(pos, run.text, attrs)
    } else {
      xmlText.insert(pos, run.text)
    }
    pos += run.text.length
  }
  return pos === 0 ? null : xmlText
}
