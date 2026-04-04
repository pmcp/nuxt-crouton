/**
 * Pool of YjsFlowClient connections, one per canvas.
 *
 * When a dispatch arrives for a canvas, the pool either returns an existing
 * connected client or creates a new one. Reference counting tracks how many
 * active sessions use each canvas — when the last session ends, the client
 * is disconnected after a grace period.
 */
import { YjsFlowClient } from './yjs-client.js'
import type { YjsFlowClientOptions } from './yjs-client.js'
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
