/**
 * ThinkGraph tools for Pi agent sessions.
 *
 * These tools allow the Pi agent to interact with the ThinkGraph canvas
 * via Yjs — the Pi worker is "just another collaborator", same as a browser.
 *
 * Write operations (update_node) go through the Y.Map and appear instantly on
 * all connected browsers. Read operations (get_graph_overview, search_graph,
 * get_thinking_path) read from the local Yjs doc. Node creation is intentionally
 * omitted — Pi suggests follow-ups via comments, the human promotes to nodes.
 *
 * store_artifact still uses HTTP — artifacts are stored server-side and not
 * part of the Yjs flow node schema.
 */
import { Type } from '@sinclair/typebox'
import type { ToolDefinition, AgentToolResult } from '@mariozechner/pi-coding-agent'
import type { YjsFlowClient, YjsFlowNode } from './yjs-client.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyToolDefinition = ToolDefinition<any, any>

/** Helper to create a text-only AgentToolResult */
function textResult(text: string): AgentToolResult<unknown> {
  return { content: [{ type: 'text', text }], details: undefined }
}

/** Create the set of ThinkGraph tools for a Pi agent session */
export function createThinkGraphTools(
  yjsClient: YjsFlowClient,
  _graphId: string,
  _parentNodeId: string,
): AnyToolDefinition[] {
  return [
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
        const existing = yjsClient.getNode(nodeId)
        if (!existing) {
          return textResult(JSON.stringify({ ok: false, error: 'Node not found in Yjs doc' }))
        }

        // Update data bag fields
        const dataUpdates: Record<string, unknown> = {}
        if (updates.content !== undefined) dataUpdates.content = updates.content
        if (updates.status !== undefined) dataUpdates.status = updates.status
        if (updates.brief !== undefined) dataUpdates.brief = updates.brief
        if (updates.starred !== undefined) dataUpdates.starred = updates.starred

        // Update top-level fields
        const nodeUpdates: Partial<YjsFlowNode> = {}
        if (updates.nodeType !== undefined) nodeUpdates.nodeType = updates.nodeType
        if (updates.content !== undefined) nodeUpdates.title = updates.content.slice(0, 80)

        yjsClient.updateNode(nodeId, {
          ...nodeUpdates,
          data: { ...existing.data, ...dataUpdates },
        })

        // Persist to DB
        yjsClient.httpPatch(nodeId, updates).catch(err => {
          console.error(`[pi-extension] DB persist for update_node failed:`, err.message)
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
        let nodes = yjsClient.getAllNodes()

        if (params.starredOnly) {
          nodes = nodes.filter(n => n.data.starred)
        }

        const lines = nodes.map((n) =>
          `${n.data.starred ? '* ' : '  '}[${n.nodeType || n.data.nodeType || 'idea'}] ${(n.title || n.data.content as string || '').slice(0, 80)} (${n.id.slice(0, 8)}...)${n.data.status && n.data.status !== 'idle' ? ` [${n.data.status}]` : ''}`,
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
        const nodes = yjsClient.getAllNodes()
        const target = nodes.find(n => n.id === params.nodeId)
        if (!target) return textResult('Node not found')

        const chain: YjsFlowNode[] = []
        let current: YjsFlowNode | undefined = target
        while (current?.parentId) {
          const parent = nodes.find(n => n.id === current!.parentId)
          if (!parent) break
          chain.unshift(parent)
          current = parent
        }

        const siblings = nodes.filter(n => n.parentId === target.parentId && n.id !== target.id)
        const children = nodes.filter(n => n.parentId === target.id)

        const label = (n: YjsFlowNode) => n.title || (n.data.content as string) || 'Untitled'

        let path = 'Thinking path:\n'
        chain.forEach((a, i) => {
          path += `${'  '.repeat(i)}-> ${label(a).slice(0, 80)} (${a.nodeType || 'idea'})\n`
        })
        path += `${'  '.repeat(chain.length)}-> [CURRENT] ${label(target)}\n\n`

        if (siblings.length > 0) {
          path += `Siblings (${siblings.length}):\n`
          siblings.forEach(s => { path += `  - ${label(s).slice(0, 80)}\n` })
          path += '\n'
        }
        if (children.length > 0) {
          path += `Children (${children.length}):\n`
          children.forEach(c => { path += `  - ${label(c).slice(0, 80)}\n` })
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
        // Artifacts use HTTP — they're stored server-side, not in Yjs
        const { nodeId, ...artifact } = params
        ;(artifact as any).provider = 'pi-agent'
        try {
          const teamId = yjsClient['config'].teamId
          const baseUrl = `${yjsClient['config'].thinkgraphUrl}/api/teams/${teamId}/thinkgraph-nodes`
          await ofetch(`${baseUrl}/${nodeId}/artifacts`, {
            method: 'POST',
            headers: {
              'Cookie': yjsClient['config'].serviceToken,
              'Content-Type': 'application/json',
            },
            body: artifact,
          })
          return textResult(JSON.stringify({ ok: true, nodeId, artifactType: params.type }))
        } catch (err: any) {
          console.error(`[pi-extension] store_artifact failed:`, err.message)
          return textResult(JSON.stringify({ ok: false, error: err.message }))
        }
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
        const query = params.query.toLowerCase()
        const limit = params.limit || 10
        const nodes = yjsClient.getAllNodes()

        const matches = nodes.filter(n => {
          const title = (n.title || '').toLowerCase()
          const content = ((n.data.content as string) || '').toLowerCase()
          const brief = ((n.data.brief as string) || '').toLowerCase()
          return title.includes(query) || content.includes(query) || brief.includes(query)
        }).slice(0, limit)

        if (matches.length === 0) return textResult('No matching nodes found')
        return textResult(matches.map(n =>
          `[${n.nodeType || n.data.nodeType || 'idea'}] ${(n.title || n.data.content as string || '').slice(0, 100)} (id: ${n.id.slice(0, 8)}...)`,
        ).join('\n'))
      },
    },
  ]
}

// Re-export ofetch for store_artifact (used via dynamic import path)
import { ofetch } from 'ofetch'
