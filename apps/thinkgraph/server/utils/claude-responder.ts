/**
 * Claude Responder — spawns a Claude CLI instance to respond to graph nodes.
 *
 * Called by the "claude-code" dispatch service when the user explicitly
 * sends a node to Claude Code. Spawns the CLI which creates child nodes
 * via MCP with full project context.
 *
 * Loop prevention: Claude creates nodes with source: 'mcp',
 * so they won't re-trigger this responder.
 *
 * Status lifecycle: thinking → working → done/error
 * Terminal output: streamed to clients via SSE
 */
import { spawn } from 'node:child_process'
import { buildAncestorChain, buildDispatchContext } from './context-builder'
import type { ContextNode } from './context-builder'
import { updateThinkgraphDecision } from '~~/layers/thinkgraph/collections/decisions/server/database/queries'

const CLAUDE_PATH = '/Users/pmcp/.local/bin/claude'
const PROJECT_DIR = '/Users/pmcp/Projects/nuxt-crouton'

// Debounce: track in-flight responses per graph to avoid flooding
const activeResponses = new Set<string>()

// Terminal output store: nodeId → { lines, listeners, status }
export interface TerminalSession {
  nodeId: string
  lines: string[]
  status: 'thinking' | 'working' | 'done' | 'error'
  startedAt: number
  listeners: Set<(event: TerminalEvent) => void>
}

export interface TerminalEvent {
  type: 'output' | 'status' | 'done' | 'error'
  data: string
  timestamp: number
}

const terminalSessions = new Map<string, TerminalSession>()

/** Get an active terminal session for a node */
export function getTerminalSession(nodeId: string): TerminalSession | undefined {
  return terminalSessions.get(nodeId)
}

/** Get all active terminal sessions */
export function getActiveTerminalSessions(): Map<string, TerminalSession> {
  return terminalSessions
}

/** Subscribe to terminal events for a node */
export function subscribeTerminal(nodeId: string, listener: (event: TerminalEvent) => void): () => void {
  const session = terminalSessions.get(nodeId)
  if (!session) return () => {}
  session.listeners.add(listener)
  return () => session.listeners.delete(listener)
}

function emitTerminalEvent(nodeId: string, event: TerminalEvent) {
  const session = terminalSessions.get(nodeId)
  if (!session) return
  if (event.type === 'output') {
    session.lines.push(event.data)
    // Keep last 200 lines to avoid memory bloat
    if (session.lines.length > 200) {
      session.lines.splice(0, session.lines.length - 200)
    }
  }
  for (const listener of session.listeners) {
    try { listener(event) } catch {}
  }
}

async function updateNodeStatus(
  nodeId: string,
  teamId: string,
  status: 'thinking' | 'working' | 'done' | 'error' | 'idle',
) {
  try {
    await updateThinkgraphDecision(nodeId, teamId, 'system', { status } as any, { role: 'admin' })
    signalCollectionChange(teamId, 'thinkgraphDecisions')
  }
  catch (err) {
    console.error(`[claude-responder] Failed to update node status to "${status}":`, err)
  }
}

export interface ClaudeResponderOptions {
  teamSlug: string
  teamId: string
  graphId: string
  node: {
    id: string
    content: string
    nodeType: string
    parentId?: string
  }
  allNodes: ContextNode[]
  depthInstruction?: string
}

export function spawnClaudeResponse(options: ClaudeResponderOptions): void {
  const { teamSlug, teamId, graphId, node, allNodes, depthInstruction } = options
  const responseKey = `${graphId}:${node.id}`

  // Don't spawn if we're already responding to this node
  if (activeResponses.has(responseKey)) return
  activeResponses.add(responseKey)

  // Create terminal session
  const session: TerminalSession = {
    nodeId: node.id,
    lines: [],
    status: 'thinking',
    startedAt: Date.now(),
    listeners: new Set(),
  }
  terminalSessions.set(node.id, session)

  // Build context using existing context-builder
  const contextNode: ContextNode = {
    id: node.id,
    content: node.content,
    nodeType: node.nodeType,
    parentId: node.parentId,
  }
  const context = buildDispatchContext(contextNode, allNodes)

  const prompt = buildClaudePrompt({
    teamSlug,
    graphId,
    nodeId: node.id,
    nodeContent: node.content,
    nodeType: node.nodeType,
    context,
    depthInstruction,
  })

  // Set node status to 'thinking' immediately
  updateNodeStatus(node.id, teamId, 'thinking')
  emitTerminalEvent(node.id, {
    type: 'status',
    data: 'thinking',
    timestamp: Date.now(),
  })

  try {
    const child = spawn(CLAUDE_PATH, [
      '-p', prompt,
      '--no-session-persistence',
      '--permission-mode', 'bypassPermissions',
      '--output-format', 'stream-json',
    ], {
      cwd: PROJECT_DIR,
      env: { ...process.env, CLAUDECODE: undefined },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    })

    let stderr = ''
    let hasReceivedOutput = false
    let lineBuffer = ''

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      stderr += text
      emitTerminalEvent(node.id, {
        type: 'output',
        data: `[stderr] ${text}`,
        timestamp: Date.now(),
      })
    })

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      lineBuffer += text

      // Parse stream-json: one JSON object per line
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() || '' // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue

        // Transition to 'working' on first real output
        if (!hasReceivedOutput) {
          hasReceivedOutput = true
          session.status = 'working'
          updateNodeStatus(node.id, teamId, 'working')
          emitTerminalEvent(node.id, {
            type: 'status',
            data: 'working',
            timestamp: Date.now(),
          })
        }

        try {
          const event = JSON.parse(line)
          const display = formatStreamEvent(event)
          if (display) {
            emitTerminalEvent(node.id, {
              type: 'output',
              data: display,
              timestamp: Date.now(),
            })
          }
        }
        catch {
          // Not valid JSON, emit raw
          emitTerminalEvent(node.id, {
            type: 'output',
            data: line,
            timestamp: Date.now(),
          })
        }
      }
    })

    child.on('error', (err) => {
      activeResponses.delete(responseKey)
      session.status = 'error'
      updateNodeStatus(node.id, teamId, 'error')
      emitTerminalEvent(node.id, {
        type: 'error',
        data: err.message,
        timestamp: Date.now(),
      })
      console.error('[claude-responder] Process error:', err)
      // Clean up session after a delay so clients can read the error
      setTimeout(() => terminalSessions.delete(node.id), 30_000)
    })

    child.on('exit', (code) => {
      activeResponses.delete(responseKey)
      if (code !== 0) {
        session.status = 'error'
        updateNodeStatus(node.id, teamId, 'error')
        emitTerminalEvent(node.id, {
          type: 'error',
          data: `Exited with code ${code}. ${stderr.slice(0, 300)}`,
          timestamp: Date.now(),
        })
        console.error(`[claude-responder] Exited with code ${code}. stderr: ${stderr.slice(0, 500)}`)
      }
      else {
        session.status = 'done'
        updateNodeStatus(node.id, teamId, 'done')
        emitTerminalEvent(node.id, {
          type: 'done',
          data: 'Completed successfully',
          timestamp: Date.now(),
        })
        console.log(`[claude-responder] Completed successfully for node "${node.content.slice(0, 50)}..."`)
      }
      // Clean up session after 30s so clients can read final state
      setTimeout(() => terminalSessions.delete(node.id), 30_000)
    })

    child.unref()

    // Clean up tracking after a timeout (max 5 minutes)
    setTimeout(() => {
      activeResponses.delete(responseKey)
      if (terminalSessions.has(node.id) && session.status !== 'done' && session.status !== 'error') {
        session.status = 'error'
        updateNodeStatus(node.id, teamId, 'error')
        emitTerminalEvent(node.id, {
          type: 'error',
          data: 'Timed out after 5 minutes',
          timestamp: Date.now(),
        })
        setTimeout(() => terminalSessions.delete(node.id), 30_000)
      }
    }, 300_000)

    console.log(`[claude-responder] Spawned Claude for node "${node.content.slice(0, 50)}..." in graph ${graphId}`)
  }
  catch (error) {
    activeResponses.delete(responseKey)
    session.status = 'error'
    updateNodeStatus(node.id, teamId, 'error')
    emitTerminalEvent(node.id, {
      type: 'error',
      data: `Failed to spawn: ${(error as Error).message}`,
      timestamp: Date.now(),
    })
    console.error('[claude-responder] Failed to spawn Claude:', error)
    setTimeout(() => terminalSessions.delete(node.id), 30_000)
  }
}

/**
 * Format a Claude Code stream-json event into a human-readable terminal line.
 * Returns null for events that shouldn't be displayed.
 *
 * Stream-json event types:
 * - { type: "system", ... } — system init
 * - { type: "assistant", subtype: "text", content: "..." } — text output
 * - { type: "assistant", subtype: "tool_use", tool: "...", input: {...} } — tool call
 * - { type: "tool_result", tool: "...", content: "..." } — tool result
 * - { type: "result", ... } — final result
 */
function formatStreamEvent(event: any): string | null {
  if (!event || !event.type) return null

  switch (event.type) {
    case 'system':
      return `⚙ ${event.message || 'System initialized'}`

    case 'assistant':
      if (event.subtype === 'text' && event.content) {
        return event.content
      }
      if (event.subtype === 'tool_use') {
        const toolName = event.tool || 'unknown'
        const inputSummary = event.input
          ? Object.entries(event.input)
              .filter(([_, v]) => typeof v === 'string' && (v as string).length < 100)
              .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
              .slice(0, 3)
              .join(' ')
          : ''
        return `🔧 ${toolName} ${inputSummary}`
      }
      return null

    case 'tool_result': {
      const result = typeof event.content === 'string'
        ? event.content.slice(0, 150)
        : JSON.stringify(event.content)?.slice(0, 150)
      return `  ↳ ${result || '(empty result)'}${(result?.length || 0) >= 150 ? '...' : ''}`
    }

    case 'result':
      return `✓ Done`

    default:
      return null
  }
}

function buildClaudePrompt(options: {
  teamSlug: string
  graphId: string
  nodeId: string
  nodeContent: string
  nodeType: string
  context: string
  depthInstruction?: string
}): string {
  const { teamSlug, graphId, nodeId, nodeContent, nodeType, context, depthInstruction } = options

  return `You are responding to a node in a ThinkGraph thinking canvas. The user just added a "${nodeType}" node. Your job is to respond thoughtfully by creating child nodes that advance the thinking.

## Graph Context

${context}

## The Node You're Responding To

ID: ${nodeId}
Type: ${nodeType}
Content: ${nodeContent}

## Instructions

1. Read the context above carefully
2. Create child nodes under node "${nodeId}" that advance the thinking
3. ${depthInstruction || '1-2 child nodes, each 1-2 sentences. Be brief and atomic.'}
4. Each node should be ONE discrete, atomic thought — something the user can branch from
5. Use appropriate node types: idea, insight, question, or decision
6. Go deep rather than broad — follow the most promising thread

## How to Create Nodes

Use the ThinkGraph MCP server tool \`create-node\` (server name: "thinkgraph"). Call it for each node you want to create:

- teamId: "${teamSlug}"
- graphId: "${graphId}"
- parentId: "${nodeId}" (or use a previously created node's ID to chain)
- content: your thought (1-2 sentences)
- nodeType: one of "idea", "insight", "question", "decision"

## Rules

- Keep nodes concise (1-2 sentences each)
- Each node = ONE atomic thought the user can branch from
- Use parentId to chain deeper thoughts (first node's ID becomes parent for the next)
- Star important insights with starred: true
- Be substantive — no filler like "Let me think about this..."
- Reference specific details from the context when relevant
- After creating nodes, output a brief 1-line summary of what you added`
}
