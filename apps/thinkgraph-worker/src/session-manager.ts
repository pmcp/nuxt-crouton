/**
 * Manages Pi agent sessions — create, steer, abort, track lifecycle.
 *
 * Wraps the Pi coding agent SDK's createAgentSession() and maps
 * agent events to terminal events for relay via WebSocket.
 */
import {
  createAgentSession,
  SessionManager as PiSessionManager,
  AuthStorage,
  ModelRegistry,
} from '@mariozechner/pi-coding-agent'
import type { WorkerConfig } from './config.js'
import { SessionWebSocket } from './session-ws.js'
import { createThinkGraphTools } from './pi-extension.js'
import { ofetch } from 'ofetch'

export interface DispatchPayload {
  nodeId: string
  graphId: string
  depth: string
  depthInstruction: string
  prompt: string
  context: string
  teamSlug: string
  nodeContent: string
  nodeType: string
}

interface ActiveSession {
  nodeId: string
  ws: SessionWebSocket
  session: any // AgentSession from Pi SDK
  abort: () => Promise<void>
}

export class AgentSessionManager {
  private activeSessions = new Map<string, ActiveSession>()

  constructor(private config: WorkerConfig) {}

  get activeCount(): number {
    return this.activeSessions.size
  }

  get maxSessions(): number {
    return this.config.maxSessions
  }

  isRunning(nodeId: string): boolean {
    return this.activeSessions.has(nodeId)
  }

  /** Start a new Pi agent session for a dispatched node */
  async startSession(payload: DispatchPayload): Promise<void> {
    if (this.activeSessions.size >= this.config.maxSessions) {
      console.warn(`[session-manager] Max sessions reached (${this.config.maxSessions}), skipping ${payload.nodeId}`)
      return
    }

    if (this.activeSessions.has(payload.nodeId)) {
      console.warn(`[session-manager] Session already running for ${payload.nodeId}`)
      return
    }

    console.log(`[session-manager] Starting session for node ${payload.nodeId}`)

    // Open WebSocket to ThinkGraph for terminal streaming
    const ws = new SessionWebSocket(this.config, payload.nodeId, {
      onSteer: (message) => this.handleSteer(payload.nodeId, message),
      onAbort: () => this.handleAbort(payload.nodeId),
      onError: (err) => console.error(`[session-manager] WS error for ${payload.nodeId}:`, err.message),
      onClose: () => {},
    })
    ws.connect()
    ws.sendStatus('thinking')

    // Update node status to 'working' via HTTP API
    await this.updateNodeStatus(payload.nodeId, 'working')

    try {
      // Create ThinkGraph tools for this session
      console.log(`[session-manager] Creating tools for ${payload.nodeId}`)
      const tools = createThinkGraphTools(this.config, payload.graphId, payload.nodeId)

      // Build the prompt
      const agentPrompt = this.buildAgentPrompt(payload)

      // Create Pi agent session
      console.log(`[session-manager] Creating agent session for ${payload.nodeId} (workDir: ${this.config.workDir})`)
      const authStorage = AuthStorage.create()
      const modelRegistry = new ModelRegistry(authStorage)

      const { session } = await createAgentSession({
        cwd: this.config.workDir,
        sessionManager: PiSessionManager.inMemory(),
        authStorage,
        modelRegistry,
        customTools: tools,
      })
      console.log(`[session-manager] Agent session created for ${payload.nodeId}`)

      // Track active session
      const activeSession: ActiveSession = {
        nodeId: payload.nodeId,
        ws,
        session,
        abort: () => session.abort(),
      }
      this.activeSessions.set(payload.nodeId, activeSession)

      // Subscribe to session events for terminal streaming
      let eventCount = 0
      session.subscribe((event: any) => {
        eventCount++
        if (eventCount <= 3) {
          console.log(`[session-manager] Event #${eventCount} for ${payload.nodeId}:`, event.type, JSON.stringify(event).slice(0, 200))
        }
        this.handleSessionEvent(payload.nodeId, event, ws)
      })

      // Start the agent work
      console.log(`[session-manager] Sending prompt for ${payload.nodeId}`)
      console.log(`[session-manager] Prompt length: ${agentPrompt.length} chars`)
      ws.sendStatus('working')
      await session.prompt(agentPrompt)
      console.log(`[session-manager] Prompt resolved for ${payload.nodeId}, events received: ${eventCount}`)

      // Session completed successfully
      ws.sendDone('Agent session completed')
      await this.updateNodeStatus(payload.nodeId, 'done')
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? error.stack : ''
      console.error(`[session-manager] Session error for ${payload.nodeId}:`, message)
      if (stack) console.error(`[session-manager] Stack:`, stack)
      ws.sendError(message)
      await this.updateNodeStatus(payload.nodeId, 'error')
    }
    finally {
      ws.close()
      this.activeSessions.delete(payload.nodeId)
      console.log(`[session-manager] Session ended for ${payload.nodeId}`)
    }
  }

  /** Handle a steering message from the browser */
  private async handleSteer(nodeId: string, message: string): Promise<void> {
    const active = this.activeSessions.get(nodeId)
    if (!active) return
    console.log(`[session-manager] Steering ${nodeId}: ${message.slice(0, 80)}`)
    try {
      await active.session.steer(message)
    }
    catch (err) {
      console.error(`[session-manager] Steer failed for ${nodeId}:`, err)
    }
  }

  /** Handle an abort command from the browser */
  private async handleAbort(nodeId: string): Promise<void> {
    const active = this.activeSessions.get(nodeId)
    if (!active) return
    console.log(`[session-manager] Aborting ${nodeId}`)
    try {
      await active.abort()
    }
    catch (err) {
      console.error(`[session-manager] Abort failed for ${nodeId}:`, err)
    }
  }

  /** Map Pi agent events to terminal output */
  private handleSessionEvent(nodeId: string, event: any, ws: SessionWebSocket): void {
    // Map common event types to terminal output
    switch (event.type) {
      case 'message_start':
        // New assistant message starting
        break
      case 'message_update': {
        // Streaming text from the assistant
        const content = event.message?.content
        if (Array.isArray(content)) {
          for (const item of content) {
            if (item.type === 'text' && item.text) {
              ws.sendOutput(item.text)
            }
            else if (item.type === 'tool_use') {
              const inputSummary = Object.entries(item.input || {})
                .filter(([_, v]) => typeof v === 'string' && (v as string).length < 80)
                .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                .slice(0, 3)
                .join(' ')
              ws.sendOutput(`🔧 ${item.name} ${inputSummary}`)
            }
            else if (item.type === 'thinking') {
              const thought = (item.thinking || '').split('\n')[0].slice(0, 120)
              if (thought) ws.sendOutput(`💭 ${thought}`)
            }
          }
        }
        break
      }
      case 'message_end':
        // Assistant message complete
        break
      case 'tool_execution_start':
        break
      case 'tool_execution_end':
        if (event.result) {
          const result = typeof event.result === 'string'
            ? event.result.slice(0, 120)
            : JSON.stringify(event.result).slice(0, 120)
          ws.sendOutput(`  ↳ ${result}`)
        }
        break
      case 'auto_compaction_start':
        ws.sendOutput('⚙ Compacting conversation...')
        break
      case 'auto_retry_start':
        ws.sendOutput(`⚙ Retrying (attempt ${event.attempt}/${event.maxAttempts})...`)
        break
    }
  }

  /** Update node status via ThinkGraph HTTP API */
  private async updateNodeStatus(nodeId: string, status: string): Promise<void> {
    try {
      await ofetch(`${this.config.thinkgraphUrl}/api/teams/${this.config.teamId}/thinkgraph-nodes/${nodeId}`, {
        method: 'PATCH',
        headers: {
          'Cookie': this.config.serviceToken,
          'Content-Type': 'application/json',
        },
        body: { status },
      })
    }
    catch (err) {
      console.error(`[session-manager] Failed to update node status:`, err)
    }
  }

  /** Build the prompt for the Pi agent */
  private buildAgentPrompt(payload: DispatchPayload): string {
    return `You are responding to a node in a ThinkGraph thinking canvas. The user dispatched a "${payload.nodeType}" node to you. Your job is to respond thoughtfully by creating child nodes that advance the thinking.

## Graph Context

${payload.context}

## The Node You're Responding To

ID: ${payload.nodeId}
Type: ${payload.nodeType}
Content: ${payload.nodeContent}

${payload.prompt ? `## User Instructions\n\n${payload.prompt}\n\n` : ''}## Instructions

1. Read the context above carefully
2. Create child nodes under node "${payload.nodeId}" that advance the thinking
3. ${payload.depthInstruction}
4. Each node should be ONE discrete, atomic thought — something the user can branch from
5. Use appropriate node types: idea, insight, question, or decision
6. Go deep rather than broad — follow the most promising thread

## How to Create Nodes

Use the \`create_node\` tool to add child nodes. For each node:
- content: your thought (1-2 sentences)
- nodeType: one of "idea", "insight", "question", "decision"
- parentId: defaults to the dispatched node, or use a previously created node's ID to chain deeper

## Rules

- Keep nodes concise (1-2 sentences each)
- Each node = ONE atomic thought the user can branch from
- Star important insights with starred: true
- Be substantive — no filler like "Let me think about this..."
- Reference specific details from the context when relevant
- After creating nodes, provide a brief 1-line summary of what you added`
  }

  /** Abort all active sessions (for graceful shutdown) */
  async abortAll(): Promise<void> {
    const promises = Array.from(this.activeSessions.values()).map(async (s) => {
      try { await s.abort() } catch {}
    })
    await Promise.allSettled(promises)
  }
}
