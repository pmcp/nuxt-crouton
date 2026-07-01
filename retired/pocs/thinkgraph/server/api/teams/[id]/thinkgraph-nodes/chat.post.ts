import { streamText } from 'ai'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getAllThinkgraphNodes } from '../../../../../layers/thinkgraph/collections/nodes/server/database/queries'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const body = await readBody(event)
  const { messages, nodeId, contextNodeIds, graphId, contextScope } = body
  // contextScope: 'node' | 'branch' (default) | 'tree' | 'canvas'
  const scope = contextScope || 'branch'

  if (!messages || !Array.isArray(messages)) {
    throw createError({ status: 400, statusText: 'Messages required' })
  }

  const allDecisions = await getAllThinkgraphNodes(team.id, graphId || undefined)

  // Build context based on scope: node | branch | tree | canvas
  let contextBlock = ''
  if (nodeId) {
    const target = allDecisions.find((d: any) => d.id === nodeId)
    if (target) {
      // Always include focused node details
      contextBlock += '## Current node details\n'
      contextBlock += `**Title:** ${target.title}\n`
      contextBlock += `**Status:** ${target.status}\n`
      if (target.template?.nodeType) contextBlock += `**Type:** ${target.template.nodeType}\n`
      if (target.brief) contextBlock += `**Brief:** ${target.brief}\n`
      if (target.output) contextBlock += `**Output/Results:** ${target.output}\n`
      if (target.summary) contextBlock += `**Summary:** ${target.summary}\n`

      const children = allDecisions.filter((d: any) => d.parentId === nodeId)
      if (children.length > 0) {
        contextBlock += '\n## Existing explorations under this node\n'
        children.forEach((c: any) => {
          contextBlock += `- ${c.title} (${c.template?.nodeType || 'node'})${c.status !== 'idle' ? ` [${c.status}]` : ''}\n`
          if (c.brief) contextBlock += `  Brief: ${c.brief}\n`
        })
      }

      // Branch / tree / canvas add progressively more context
      if (scope !== 'node') {
        const ancestors = buildAncestorChain(allDecisions, nodeId)

        if (ancestors.length > 0) {
          contextBlock += '\n## Thinking path (root → current)\n'
          ancestors.forEach((a: any, i: number) => {
            contextBlock += `${'  '.repeat(i)}→ ${a.title} (${a.template?.nodeType || 'node'})\n`
          })
          contextBlock += `${'  '.repeat(ancestors.length)}→ [FOCUS] ${target.title}\n`

          // Include parent brief for upstream context
          const parent = ancestors[ancestors.length - 1]
          if (parent.brief) {
            contextBlock += `\n## Parent node brief\n${parent.brief}\n`
          }
        }

        // Tree scope: include the full subtree from root ancestor
        if (scope === 'tree' && ancestors.length > 0) {
          const rootId = ancestors[0].id
          contextBlock += '\n## Full branch tree\n'
          contextBlock += buildTreeString(allDecisions, rootId, 0, nodeId)
        }

        // Canvas scope: include entire graph
        if (scope === 'canvas') {
          const roots = allDecisions.filter((d: any) => !d.parentId)
          if (roots.length > 0) {
            contextBlock += '\n## Full canvas (all branches)\n'
            roots.forEach((r: any) => {
              contextBlock += buildTreeString(allDecisions, r.id, 0, nodeId)
            })
          }
        }
      }

      // Starred insights (always, for branch/tree/canvas)
      if (scope !== 'node') {
        const starred = allDecisions.filter((d: any) => d.starred && d.id !== nodeId)
        if (starred.length > 0) {
          contextBlock += '\n## Starred insights\n'
          starred.slice(0, 5).forEach((s: any) => {
            contextBlock += `⭐ ${s.title}\n`
          })
        }
      }
    }
  }

  // Add cross-branch context from selected nodes
  if (Array.isArray(contextNodeIds) && contextNodeIds.length > 0) {
    const selectedNodes = contextNodeIds
      .map((id: string) => allDecisions.find((d: any) => d.id === id))
      .filter(Boolean)

    if (selectedNodes.length > 0) {
      contextBlock += '\n## Selected context from other branches\n'
      for (const node of selectedNodes) {
        const nodeAncestors = buildAncestorChain(allDecisions, node.id)
        contextBlock += `── ${(node.template?.nodeType || 'node').toUpperCase()}: ${node.title}\n`
        if (nodeAncestors.length > 0) {
          contextBlock += `   Path: ${nodeAncestors.map((a: any) => a.title.slice(0, 50)).join(' → ')}\n`
        }
        if (node.brief) contextBlock += `   Brief: ${node.brief}\n`
        contextBlock += '\n'
      }
    }
  }

  if (!nodeId && !(Array.isArray(contextNodeIds) && contextNodeIds.length > 0)) {
    // No specific node — provide full graph overview
    const roots = allDecisions.filter((d: any) => !d.parentId)
    if (roots.length > 0) {
      contextBlock += '## Thinking graph overview\n'
      roots.forEach((r: any) => {
        contextBlock += buildTreeString(allDecisions, r.id, 0)
      })
    }
  }

  const ai = createAIProvider(event)

  const result = streamText({
    model: ai.model(ai.getDefaultModel()),
    system: `You are a structured thinking partner. You help the user explore decisions, challenge assumptions, and find insights.

${contextBlock ? `The user is working on a thinking graph and chatting from a specific node. You have full context of this node and its place in the tree. Use it to give grounded, specific answers — never say you lack context about what "this" refers to.\n\nHere is the current context:\n\n${contextBlock}\n\n` : ''}
When you have a key insight worth adding to the graph, format it on its own line as:
DECISION: {"content": "your insight", "nodeType": "idea"|"question"|"insight"|"decision"}

You can include multiple DECISION lines in a single response. The user can then choose which ones to add to their graph.

Be concise. Ask clarifying questions. Challenge weak reasoning. Suggest novel angles.`,
    messages,
  })

  return result.toDataStreamResponse()
})

function buildAncestorChain(allDecisions: any[], targetId: string): any[] {
  const chain: any[] = []
  let current = allDecisions.find((d: any) => d.id === targetId)
  while (current?.parentId) {
    const parent = allDecisions.find((d: any) => d.id === current.parentId)
    if (!parent) break
    chain.unshift(parent)
    current = parent
  }
  return chain
}

function buildTreeString(allDecisions: any[], nodeId: string, depth: number, focusId?: string): string {
  const node = allDecisions.find((d: any) => d.id === nodeId)
  if (!node) return ''

  const isFocus = nodeId === focusId
  const prefix = isFocus ? '→ [FOCUS] ' : (node.starred ? '⭐ ' : '')
  let str = `${'  '.repeat(depth)}${prefix}${node.title} (${node.template?.nodeType || 'node'})\n`
  const children = allDecisions.filter((d: any) => d.parentId === nodeId)
  for (const child of children) {
    str += buildTreeString(allDecisions, child.id, depth + 1, focusId)
  }
  return str
}
