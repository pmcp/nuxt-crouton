/**
 * Pool of YjsFlowClient connections, one per canvas.
 *
 * When a dispatch arrives for a canvas, the pool either returns an existing
 * connected client or creates a new one. Reference counting tracks how many
 * active sessions use each canvas — when the last session ends, the client
 * is disconnected after a grace period.
 *
 * The companion `YjsPagePool` (also exported below) manages per-(team, node)
 * page room clients used by `pi.appendBlock` to write into the slideover's
 * Notion-style block editor.
 */
import { YjsFlowClient } from './yjs-client.js'
import type { YjsFlowClientOptions } from './yjs-client.js'
import { YjsPageClient } from './yjs-page-client.js'
import type { WorkerConfig } from './config.js'
import { ofetch } from 'ofetch'

interface PoolEntry {
  client: YjsFlowClient
  refCount: number
  /** Timer to disconnect after grace period when refCount hits 0 */
  disconnectTimer: ReturnType<typeof setTimeout> | null
}

export interface YjsFlowPoolCallbacks {
  onUserPrompt?: (nodeId: string, prompt: string) => void
  onUserAbort?: (nodeId: string) => void
  onUserSteer?: (nodeId: string, message: string) => void
}

/** Grace period before disconnecting an unused canvas room (ms) */
const DISCONNECT_GRACE_MS = 60_000 // 1 minute

export class YjsFlowPool {
  private entries = new Map<string, PoolEntry>()
  private config: WorkerConfig
  private callbacks: YjsFlowPoolCallbacks
  /** Cache projectId → flowId to avoid repeated lookups */
  private flowIdCache = new Map<string, string>()

  constructor(config: WorkerConfig, callbacks: YjsFlowPoolCallbacks) {
    this.config = config
    this.callbacks = callbacks
  }

  /**
   * Resolve a projectId to the Yjs flow room ID.
   *
   * The browser creates flow_configs named "project-{projectId}" and uses
   * the config's ID as the Yjs room key. We need to look that up so we
   * join the same room.
   */
  async resolveFlowId(projectId: string, teamId: string): Promise<string | null> {
    // Check cache first
    const cached = this.flowIdCache.get(projectId)
    if (cached) return cached

    try {
      const flowName = `project-${projectId}`
      const flows = await ofetch<any[]>(
        `${this.config.thinkgraphUrl}/api/crouton-flow/teams/${teamId}/flows`,
        {
          headers: { 'Cookie': this.config.serviceToken },
          query: { collection: 'thinkgraphNodes', name: flowName },
        },
      )
      const existing = flows?.find((f: any) => f.name === flowName)
      if (existing?.id) {
        this.flowIdCache.set(projectId, existing.id)
        return existing.id
      }
      console.warn(`[yjs-pool] No flow config found for project ${projectId} (name: ${flowName})`)
      return null
    } catch (err) {
      console.warn(`[yjs-pool] Flow config lookup failed for project ${projectId}: ${err instanceof Error ? err.message : err}`)
      return null
    }
  }

  /**
   * Get or create a connected YjsFlowClient for a flow room.
   * Increments the reference count. Call `release(flowId)` when the session ends.
   */
  async acquire(flowId: string): Promise<YjsFlowClient> {
    const existing = this.entries.get(flowId)

    if (existing) {
      // Cancel any pending disconnect
      if (existing.disconnectTimer) {
        clearTimeout(existing.disconnectTimer)
        existing.disconnectTimer = null
      }
      existing.refCount++
      console.log(`[yjs-pool] Reusing connection for canvas ${flowId} (refs: ${existing.refCount})`)

      // If disconnected (e.g. after error), reconnect
      if (!existing.client.isConnected) {
        try {
          await existing.client.connect()
        } catch (err) {
          console.warn(`[yjs-pool] Reconnect failed for ${flowId}: ${err instanceof Error ? err.message : err}`)
        }
      }

      return existing.client
    }

    // Create new client for this canvas
    const client = new YjsFlowClient({
      config: this.config,
      flowId,
      onUserPrompt: this.callbacks.onUserPrompt,
      onUserAbort: this.callbacks.onUserAbort,
      onUserSteer: this.callbacks.onUserSteer,
    })

    const entry: PoolEntry = {
      client,
      refCount: 1,
      disconnectTimer: null,
    }
    this.entries.set(flowId, entry)

    // Connect
    try {
      await client.connect()
      console.log(`[yjs-pool] Connected to canvas ${flowId} (refs: 1)`)
    } catch (err) {
      console.warn(`[yjs-pool] Connection failed for ${flowId}: ${err instanceof Error ? err.message : err}`)
      // Still return the client — it has HTTP fallback methods
    }

    return client
  }

  /**
   * Release a reference to a canvas client.
   * When refCount hits 0, starts a grace timer before disconnecting.
   */
  release(flowId: string): void {
    const entry = this.entries.get(flowId)
    if (!entry) return

    entry.refCount = Math.max(0, entry.refCount - 1)
    console.log(`[yjs-pool] Released canvas ${flowId} (refs: ${entry.refCount})`)

    if (entry.refCount === 0) {
      // Start grace period — another dispatch for this canvas might arrive soon
      entry.disconnectTimer = setTimeout(() => {
        const current = this.entries.get(flowId)
        if (current && current.refCount === 0) {
          console.log(`[yjs-pool] Disconnecting idle canvas ${flowId}`)
          current.client.disconnect()
          this.entries.delete(flowId)
        }
      }, DISCONNECT_GRACE_MS)
    }
  }

  /** Get a client without acquiring (no ref count change). Returns null if not connected. */
  peek(flowId: string): YjsFlowClient | null {
    return this.entries.get(flowId)?.client ?? null
  }

  /** Disconnect all canvas rooms (for shutdown) */
  disconnectAll(): void {
    for (const [flowId, entry] of this.entries) {
      if (entry.disconnectTimer) clearTimeout(entry.disconnectTimer)
      entry.client.disconnect()
    }
    this.entries.clear()
  }

  /** Number of active canvas connections */
  get size(): number {
    return this.entries.size
  }

  /** Summary for health endpoint */
  getStatus(): Record<string, { connected: boolean; synced: boolean; refs: number }> {
    const status: Record<string, { connected: boolean; synced: boolean; refs: number }> = {}
    for (const [flowId, entry] of this.entries) {
      status[flowId] = {
        connected: entry.client.isConnected,
        synced: entry.client.isSynced,
        refs: entry.refCount,
      }
    }
    return status
  }
}

// ── Page room pool ─────────────────────────────────────────

interface PageEntry {
  client: YjsPageClient
  /** Last time the client was used — used by the idle sweep */
  lastUsedAt: number
  closeTimer: ReturnType<typeof setTimeout> | null
}

/** Idle period after which an unused page room is disconnected. */
const PAGE_IDLE_CLOSE_MS = 30_000

/**
 * Pool of YjsPageClient connections keyed by `${teamId}::${nodeId}`.
 *
 * Page rooms are short-lived: a Pi skill calls `pi.appendBlock(nodeId, ...)`
 * a handful of times during a session, the writes flush to the room, and
 * we can let the connection drop. We keep an idle timer rather than refcounts
 * because there's no clear "session ends" event for an arbitrary tool call —
 * the same Pi run may write to many different nodes, and each call should
 * extend the lease on its target room.
 */
export class YjsPagePool {
  private entries = new Map<string, PageEntry>()
  private config: WorkerConfig

  constructor(config: WorkerConfig) {
    this.config = config
  }

  private key(teamId: string, nodeId: string): string {
    return `${teamId}::${nodeId}`
  }

  /**
   * Get or create a connected page client for `(teamId, nodeId)`.
   * Resolves only once the room has finished its initial Yjs sync, so the
   * caller's first append doesn't race the empty initial state.
   */
  async acquire(teamId: string, nodeId: string): Promise<YjsPageClient> {
    const k = this.key(teamId, nodeId)
    const existing = this.entries.get(k)

    if (existing) {
      this.touch(k)
      // Reconnect if we lost the socket since last use
      if (!existing.client.isConnected) {
        try {
          await existing.client.connect()
        } catch (err) {
          console.warn(`[yjs-page-pool] Reconnect failed for ${k}: ${err instanceof Error ? err.message : err}`)
        }
      }
      await existing.client.awaitSynced()
      return existing.client
    }

    const client = new YjsPageClient({ config: this.config, teamId, nodeId })
    const entry: PageEntry = {
      client,
      lastUsedAt: Date.now(),
      closeTimer: null,
    }
    this.entries.set(k, entry)

    try {
      await client.connect()
      console.log(`[yjs-page-pool] Connected to page room ${k}`)
    } catch (err) {
      console.warn(`[yjs-page-pool] Connection failed for ${k}: ${err instanceof Error ? err.message : err}`)
      // Drop the entry so the next call retries from scratch
      this.entries.delete(k)
      throw err
    }

    this.touch(k)
    return client
  }

  /**
   * Mark the entry as recently used and reset its idle close timer.
   * Should be called by the tool implementation after each successful append.
   */
  touch(teamIdOrKey: string, nodeId?: string): void {
    const k = nodeId ? this.key(teamIdOrKey, nodeId) : teamIdOrKey
    const entry = this.entries.get(k)
    if (!entry) return
    entry.lastUsedAt = Date.now()
    if (entry.closeTimer) clearTimeout(entry.closeTimer)
    entry.closeTimer = setTimeout(() => {
      const current = this.entries.get(k)
      if (!current) return
      console.log(`[yjs-page-pool] Disconnecting idle page room ${k}`)
      current.client.disconnect()
      this.entries.delete(k)
    }, PAGE_IDLE_CLOSE_MS)
  }

  disconnectAll(): void {
    for (const [, entry] of this.entries) {
      if (entry.closeTimer) clearTimeout(entry.closeTimer)
      entry.client.disconnect()
    }
    this.entries.clear()
  }

  get size(): number {
    return this.entries.size
  }

  getStatus(): Record<string, { connected: boolean; synced: boolean; idleMs: number }> {
    const status: Record<string, { connected: boolean; synced: boolean; idleMs: number }> = {}
    const now = Date.now()
    for (const [k, entry] of this.entries) {
      status[k] = {
        connected: entry.client.isConnected,
        synced: entry.client.isSynced,
        idleMs: now - entry.lastUsedAt,
      }
    }
    return status
  }
}
