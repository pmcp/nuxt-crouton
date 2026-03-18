/**
 * ThinkGraph tools for Pi agent sessions.
 *
 * These tools allow the Pi agent to interact with ThinkGraph:
 * create nodes, update nodes, get graph context, store artifacts, etc.
 *
 * Tools call ThinkGraph's HTTP API — the Pi worker is "just another user."
 *
 * Uses the Pi SDK's ToolDefinition interface with TypeBox parameter schemas.
 */
import { Type } from '@sinclair/typebox'
import { ofetch } from 'ofetch'
import type { ToolDefinition, AgentToolResult } from '@mariozechner/pi-coding-agent'
import type { WorkerConfig } from './config.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyToolDefinition = ToolDefinition<any, any>

/** Helper to create a text-only AgentToolResult */
function textResult(text: string): AgentToolResult<unknown> {
  return { content: [{ type: 'text', text }], details: undefined }
}

/** Create the set of ThinkGraph tools for a Pi agent session */
export function createThinkGraphTools(
  config: WorkerConfig,
  graphId: string,
  parentNodeId: string,
): AnyToolDefinition[] {
  const baseUrl = `${config.thinkgraphUrl}/api/teams/${config.teamId}`

  const headers = {
    'Cookie': config.serviceToken,
    'Content-Type': 'application/json',
  }

  return [
    {
      name: 'create_node',
      label: 'Create Node',
      description: 'Create a new node in the ThinkGraph thinking canvas. Use this to add child thoughts, insights, questions, or decisions.',
      parameters: Type.Object({
        title: Type.String({ description: 'Short post-it headline (5-10 words max)' }),
        brief: Type.Optional(Type.String({ description: 'The actual thought — 1-2 sentences explaining the idea' })),
        nodeType: Type.Optional(Type.String({ description: 'Node type: idea, insight, question, decision', default: 'idea' })),
        parentId: Type.Optional(Type.String({ description: 'Parent node ID. Defaults to the dispatched node.' })),
        starred: Type.Optional(Type.Boolean({ description: 'Star important insights' })),
      }),
      execute: async (_toolCallId, params) => {
        const body = {
          canvasId: graphId,
          title: params.title,
          nodeType: params.nodeType || 'idea',
          parentId: params.parentId || parentNodeId,
          starred: params.starred || false,
          brief: params.brief || '',
          status: 'idle',
          origin: 'ai',
          source: 'pi-agent',
          contextScope: 'branch',
        }
        try {
          const result = await ofetch(`${baseUrl}/thinkgraph-nodes`, {
            method: 'POST',
            headers,
            body,
          })
          return textResult(JSON.stringify({ ok: true, nodeId: result.id, title: body.title }))
        } catch (err: any) {
          console.error(`[pi-extension] create_node failed:`, err.message, err.data || '')
          return textResult(JSON.stringify({ ok: false, error: err.message }))
        }
      },
    },
    {
      name: 'update_node',
      label: 'Update Node',
      description: 'Update an existing node in the ThinkGraph canvas.',
      parameters: Type.Object({
        nodeId: Type.String({ description: 'The node ID to update' }),
        content: Type.Optional(Type.String({ description: 'Updated content' })),
        status: Type.Optional(Type.String({ description: 'Node status: idle, working, done, error' })),
        brief: Type.Optional(Type.String({ description: 'Updated handoff brief' })),
        starred: Type.Optional(Type.Boolean({ description: 'Star/unstar the node' })),
        nodeType: Type.Optional(Type.String({ description: 'Change node type' })),
      }),
      execute: async (_toolCallId, params) => {
        const { nodeId, ...updates } = params
        await ofetch(`${baseUrl}/thinkgraph-nodes/${nodeId}`, {
          method: 'PATCH',
          headers,
          body: updates,
        })
        return textResult(JSON.stringify({ ok: true, nodeId, updated: Object.keys(updates) }))
      },
    },
    {
      name: 'get_graph_overview',
      label: 'Graph Overview',
      description: 'Get an overview of the entire ThinkGraph canvas as a tree structure.',
      parameters: Type.Object({
        starredOnly: Type.Optional(Type.Boolean({ description: 'Only show starred nodes' })),
      }),
      execute: async (_toolCallId, params) => {
        const query = new URLSearchParams({ graphId })
        if (params.starredOnly) query.set('starred', 'true')
        const result = await ofetch(`${baseUrl}/thinkgraph-nodes?${query}`, { headers })
        const nodes = Array.isArray(result) ? result : result.data || []
        const lines = nodes.map((n: any) =>
          `${n.starred ? '* ' : '  '}[${n.nodeType}] ${n.content?.slice(0, 80)} (${n.id.slice(0, 8)}...)${n.status !== 'idle' ? ` [${n.status}]` : ''}`
        )
        return textResult(lines.join('\n') || 'Empty graph')
      },
    },
    {
      name: 'get_thinking_path',
      label: 'Thinking Path',
      description: 'Get the thinking path (ancestor chain + siblings + children) for a specific node.',
      parameters: Type.Object({
        nodeId: Type.String({ description: 'The node ID to get the thinking path for' }),
      }),
      execute: async (_toolCallId, params) => {
        const result = await ofetch(`${baseUrl}/thinkgraph-nodes?graphId=${graphId}`, { headers })
        const nodes = Array.isArray(result) ? result : result.data || []
        const target = nodes.find((n: any) => n.id === params.nodeId)
        if (!target) return textResult('Node not found')

        const chain: any[] = []
        let current = target
        while (current?.parentId) {
          const parent = nodes.find((n: any) => n.id === current.parentId)
          if (!parent) break
          chain.unshift(parent)
          current = parent
        }

        const siblings = nodes.filter((n: any) => n.parentId === target.parentId && n.id !== target.id)
        const children = nodes.filter((n: any) => n.parentId === target.id)

        let path = 'Thinking path:\n'
        chain.forEach((a, i) => {
          path += `${'  '.repeat(i)}-> ${a.content?.slice(0, 80)} (${a.nodeType})\n`
        })
        path += `${'  '.repeat(chain.length)}-> [CURRENT] ${target.content}\n\n`

        if (siblings.length > 0) {
          path += `Siblings (${siblings.length}):\n`
          siblings.forEach((s: any) => { path += `  - ${s.content?.slice(0, 80)}\n` })
          path += '\n'
        }
        if (children.length > 0) {
          path += `Children (${children.length}):\n`
          children.forEach((c: any) => { path += `  - ${c.content?.slice(0, 80)}\n` })
        }
        return textResult(path)
      },
    },
    {
      name: 'store_artifact',
      label: 'Store Artifact',
      description: 'Store an artifact (code, text, image URL) on a node.',
      parameters: Type.Object({
        nodeId: Type.String({ description: 'The node ID to attach the artifact to' }),
        type: Type.String({ description: 'Artifact type: code, text, image, prototype' }),
        content: Type.Optional(Type.String({ description: 'Artifact content (for code/text)' })),
        url: Type.Optional(Type.String({ description: 'Artifact URL (for images/prototypes)' })),
        prompt: Type.Optional(Type.String({ description: 'The prompt that generated this artifact' })),
      }),
      execute: async (_toolCallId, params) => {
        const { nodeId, ...artifact } = params
        ;(artifact as any).provider = 'pi-agent'
        await ofetch(`${baseUrl}/thinkgraph-nodes/${nodeId}/artifacts`, {
          method: 'POST',
          headers,
          body: artifact,
        })
        return textResult(JSON.stringify({ ok: true, nodeId, artifactType: params.type }))
      },
    },
    {
      name: 'search_graph',
      label: 'Search Graph',
      description: 'Search the ThinkGraph canvas for nodes matching a query.',
      parameters: Type.Object({
        query: Type.String({ description: 'Search query' }),
        limit: Type.Optional(Type.Number({ description: 'Max results (default: 10)' })),
      }),
      execute: async (_toolCallId, params) => {
        const query = new URLSearchParams({
          graphId,
          search: params.query,
          limit: String(params.limit || 10),
        })
        const result = await ofetch(`${baseUrl}/thinkgraph-nodes?${query}`, { headers })
        const nodes = Array.isArray(result) ? result : result.data || []
        if (nodes.length === 0) return textResult('No matching nodes found')
        return textResult(nodes.map((n: any) =>
          `[${n.nodeType}] ${n.content?.slice(0, 100)} (id: ${n.id.slice(0, 8)}...)`
        ).join('\n'))
      },
    },
  ]
}
