import { streamText } from 'ai'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getAllThinkgraphDecisions } from '../../../../../layers/thinkgraph/collections/decisions/server/database/queries'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const body = await readBody(event)
  const { messages, nodeId, contextNodeIds } = body

  if (!messages || !Array.isArray(messages)) {
    throw createError({ status: 400, statusText: 'Messages required' })
  }

  const allDecisions = await getAllThinkgraphDecisions(team.id)

  // Build context from the selected node's thinking path
  let contextBlock = ''
  if (nodeId) {
    const target = allDecisions.find((d: any) => d.id === nodeId)
    if (target) {
      const ancestors = buildAncestorChain(allDecisions, nodeId)
      const starred = allDecisions.filter((d: any) => d.starred && d.id !== nodeId)
      const children = allDecisions.filter((d: any) => d.parentId === nodeId)

      contextBlock += '## Current thinking path\n'
      ancestors.forEach((a: any, i: number) => {
        contextBlock += `${'  '.repeat(i)}→ ${a.content} (${a.nodeType})\n`
      })
      contextBlock += `${'  '.repeat(ancestors.length)}→ [FOCUS] ${target.content} (${target.nodeType})\n`

      if (children.length > 0) {
        contextBlock += '\n## Existing explorations under this node\n'
        children.forEach((c: any) => {
          contextBlock += `- ${c.content} (${c.nodeType})\n`
        })
      }

      if (starred.length > 0) {
        contextBlock += '\n## Starred insights\n'
        starred.slice(0, 5).forEach((s: any) => {
          contextBlock += `⭐ ${s.content}\n`
        })
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
        contextBlock += `── ${node.nodeType.toUpperCase()}: ${node.content}\n`
        if (nodeAncestors.length > 0) {
          contextBlock += `   Path: ${nodeAncestors.map((a: any) => a.content.slice(0, 50)).join(' → ')}\n`
        }
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

${contextBlock ? `The user is working on a thinking graph. Here is the current context:\n\n${contextBlock}\n\n` : ''}
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

function buildTreeString(allDecisions: any[], nodeId: string, depth: number): string {
  const node = allDecisions.find((d: any) => d.id === nodeId)
  if (!node) return ''

  let str = `${'  '.repeat(depth)}${node.starred ? '⭐ ' : ''}${node.content} (${node.nodeType})\n`
  const children = allDecisions.filter((d: any) => d.parentId === nodeId)
  for (const child of children) {
    str += buildTreeString(allDecisions, child.id, depth + 1)
  }
  return str
}
