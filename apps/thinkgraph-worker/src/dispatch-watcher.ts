/**
 * Dispatch Watcher — polls ThinkGraph API for nodes with 'dispatching' status.
 *
 * Instead of relying on Yjs (which requires matching the Durable Object protocol),
 * this uses simple HTTP polling with optimistic concurrency for pickup.
 *
 * When a node with status 'dispatching' is found:
 * 1. Try to claim it (PATCH status to 'working' with _expectedStatus: 'dispatching')
 * 2. If claimed successfully, extract handoff metadata and start a Pi agent session
 * 3. If 409 conflict, another worker already claimed it — skip
 *
 * Future: Replace polling with Yjs client once DO protocol compatibility is verified.
 */
import { ofetch } from 'ofetch'
import type { WorkerConfig } from './config.js'
import type { AgentSessionManager, DispatchPayload } from './session-manager.js'

export class DispatchWatcher {
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private polling = false

  constructor(
    private config: WorkerConfig,
    private sessionManager: AgentSessionManager,
    private pollIntervalMs = 5000,
  ) {}

  /** Start watching for dispatch triggers */
  start(): void {
    console.log(`[dispatch-watcher] Watching team ${this.config.teamId} (poll every ${this.pollIntervalMs}ms)`)
    this.poll() // Initial poll
    this.pollTimer = setInterval(() => this.poll(), this.pollIntervalMs)
  }

  /** Stop watching */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  /** Poll for dispatching nodes */
  private async poll(): Promise<void> {
    if (this.polling) return // Don't overlap polls
    this.polling = true

    try {
      // Fetch all nodes — filter for 'dispatching' status
      const baseUrl = `${this.config.thinkgraphUrl}/api/teams/${this.config.teamId}`
      const result = await ofetch(`${baseUrl}/thinkgraph-nodes`, {
        headers: {
          'Cookie': this.config.serviceToken,
        },
        query: { status: 'dispatching' },
      })

      const nodes = Array.isArray(result) ? result : result?.data || []
      const dispatching = nodes.filter((n: any) => n.status === 'dispatching')

      for (const node of dispatching) {
        // Skip if already running or at capacity
        if (this.sessionManager.isRunning(node.id)) continue
        if (this.sessionManager.activeCount >= this.sessionManager.maxSessions) break

        // Extract handoff metadata from artifacts
        const handoff = this.extractHandoffMeta(node)
        if (!handoff) {
          console.warn(`[dispatch-watcher] Node ${node.id} has no handoff metadata, skipping`)
          continue
        }

        // Try to claim this node
        const claimed = await this.claimNode(node.id)
        if (!claimed) continue

        console.log(`[dispatch-watcher] Claimed node ${node.id}: "${(node.title || node.content)?.slice(0, 50)}"`)

        // Start agent session (non-blocking)
        const payload: DispatchPayload = {
          nodeId: node.id,
          graphId: handoff.graphId || node.canvasId || node.graphId,
          depth: handoff.depth || 'concise',
          depthInstruction: handoff.depthInstruction || '1-2 child nodes, each 1-2 sentences.',
          prompt: handoff.prompt || '',
          context: handoff.context || '',
          teamSlug: handoff.teamSlug || this.config.teamId,
          nodeContent: handoff.nodeContent || node.title || node.content,
          nodeType: handoff.nodeType || node.nodeType,
          mode: handoff.mode || 'legacy',
        }

        // Run in background — don't block the poll loop
        this.sessionManager.startSession(payload).catch((err) => {
          console.error(`[dispatch-watcher] Failed to start session for ${node.id}:`, err)
        })
      }
    }
    catch (err) {
      // Don't crash the watcher on network errors
      console.error(`[dispatch-watcher] Poll error:`, err instanceof Error ? err.message : err)
    }
    finally {
      this.polling = false
    }
  }

  /** Extract handoff metadata from node */
  private extractHandoffMeta(node: any): any | null {
    // New schema: handoffMeta is a direct field on the node
    if (node.handoffMeta && typeof node.handoffMeta === 'object' && node.handoffMeta.service) {
      return node.handoffMeta
    }
    // Legacy: check artifacts array
    const artifacts = Array.isArray(node.artifacts) ? node.artifacts : []
    return artifacts.find((a: any) => a?.type === 'handoff') || null
  }

  /** Try to claim a dispatching node via optimistic concurrency */
  private async claimNode(nodeId: string): Promise<boolean> {
    try {
      const baseUrl = `${this.config.thinkgraphUrl}/api/teams/${this.config.teamId}`
      await ofetch(`${baseUrl}/thinkgraph-nodes/${nodeId}`, {
        method: 'PATCH',
        headers: {
          'Cookie': this.config.serviceToken,
          'Content-Type': 'application/json',
        },
        body: {
          status: 'working',
          _expectedStatus: 'dispatching',
        },
      })
      return true
    }
    catch (err: any) {
      if (err?.status === 409 || err?.statusCode === 409) {
        // Another worker already claimed this node
        return false
      }
      console.error(`[dispatch-watcher] Failed to claim node ${nodeId}:`, err?.message)
      return false
    }
  }
}
