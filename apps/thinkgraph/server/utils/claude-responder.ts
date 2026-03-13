/**
 * Claude Responder — spawns a Claude CLI instance to respond to graph nodes.
 *
 * Called by the "claude-code" dispatch service when the user explicitly
 * sends a node to Claude Code. Spawns the CLI which creates child nodes
 * via MCP with full project context.
 *
 * Loop prevention: Claude creates nodes with source: 'mcp',
 * so they won't re-trigger this responder.
 */
import { spawn } from 'node:child_process'
import { buildAncestorChain, buildDispatchContext } from './context-builder'
import type { ContextNode } from './context-builder'

const CLAUDE_PATH = '/Users/pmcp/.local/bin/claude'
const PROJECT_DIR = '/Users/pmcp/Projects/nuxt-crouton'

// Debounce: track in-flight responses per graph to avoid flooding
const activeResponses = new Set<string>()

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
  const { teamSlug, graphId, node, allNodes, depthInstruction } = options
  const responseKey = `${graphId}:${node.id}`

  // Don't spawn if we're already responding to this node
  if (activeResponses.has(responseKey)) return
  activeResponses.add(responseKey)

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

  try {
    const child = spawn(CLAUDE_PATH, [
      '-p', prompt,
      '--no-session-persistence',
      '--permission-mode', 'bypassPermissions',
    ], {
      cwd: PROJECT_DIR,
      env: { ...process.env, CLAUDECODE: undefined },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    })

    let stderr = ''
    child.stderr?.on('data', (data: Buffer) => { stderr += data.toString() })
    child.stdout?.on('data', (data: Buffer) => {
      console.log(`[claude-responder] stdout: ${data.toString().slice(0, 200)}`)
    })

    child.on('error', (err) => {
      activeResponses.delete(responseKey)
      console.error('[claude-responder] Process error:', err)
    })

    child.on('exit', (code) => {
      activeResponses.delete(responseKey)
      if (code !== 0) {
        console.error(`[claude-responder] Exited with code ${code}. stderr: ${stderr.slice(0, 500)}`)
      } else {
        console.log(`[claude-responder] Completed successfully for node "${node.content.slice(0, 50)}..."`)
      }
    })

    child.unref()

    // Clean up tracking after a timeout (max 2 minutes)
    setTimeout(() => {
      activeResponses.delete(responseKey)
    }, 120_000)

    console.log(`[claude-responder] Spawned Claude for node "${node.content.slice(0, 50)}..." in graph ${graphId}`)
  }
  catch (error) {
    activeResponses.delete(responseKey)
    console.error('[claude-responder] Failed to spawn Claude:', error)
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
