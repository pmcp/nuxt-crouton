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
const MCP_PORT = 3004

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
      stdio: 'ignore',
      detached: true,
    })

    child.unref()

    // Clean up tracking after a timeout (max 2 minutes)
    setTimeout(() => {
      activeResponses.delete(responseKey)
    }, 120_000)

    child.on('exit', () => {
      activeResponses.delete(responseKey)
    })

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

Write each node's JSON to /tmp/thinkgraph-node.json, then POST to the MCP endpoint:

\`\`\`bash
cat > /tmp/thinkgraph-node.json << 'ENDJSON'
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create-node",
    "arguments": {
      "teamId": "${teamSlug}",
      "graphId": "${graphId}",
      "content": "<your thought>",
      "nodeType": "<idea|insight|question|decision>",
      "parentId": "${nodeId}"
    }
  }
}
ENDJSON
curl -s -X POST http://localhost:${MCP_PORT}/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d @/tmp/thinkgraph-node.json
\`\`\`

## Rules

- Keep nodes concise (1-3 sentences each)
- Don't create more than 3 nodes
- Use parentId to chain deeper thoughts (first node's ID becomes parent for the next)
- Star important insights with "starred": true
- Be substantive — no filler like "Let me think about this..."
- Reference specific details from the context when relevant
- After creating nodes, output a brief 1-line summary of what you added`
}
