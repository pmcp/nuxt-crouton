import { registerDispatchService } from '../dispatch-registry'
import { spawnClaudeResponse } from '../claude-responder'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

registerDispatchService({
  id: 'claude-code',
  name: 'Claude Code',
  description: 'Send to Claude Code CLI — creates nodes via MCP with full project context',
  type: 'text',
  icon: 'i-lucide-terminal',
  options: [
    {
      key: 'depth',
      label: 'Response depth',
      type: 'select',
      choices: ['concise', 'thorough', 'deep'],
      default: 'concise',
    },
  ],
  execute: async (context: DispatchContext, _event: H3Event): Promise<DispatchResult> => {
    const meta = context._meta
    if (!meta) {
      throw createError({ status: 500, statusText: 'Claude Code requires dispatch metadata' })
    }

    const targetNode = meta.allDecisions.find((d: any) => d.id === meta.decisionId)
    if (!targetNode) {
      throw createError({ status: 404, statusText: 'Decision not found' })
    }

    const depth = (context.options?.depth as string) || 'concise'
    const depthInstructions: Record<string, string> = {
      concise: '1-2 child nodes, each 1-2 sentences. Be brief and atomic.',
      thorough: '2-3 child nodes, each 1-3 sentences. Cover the key angles.',
      deep: '3-5 child nodes. Go deep — chain thoughts using parentId so each builds on the previous.',
    }

    spawnClaudeResponse({
      teamSlug: meta.teamSlug,
      teamId: meta.teamId,
      graphId: meta.graphId,
      node: {
        id: meta.decisionId,
        content: targetNode.content,
        nodeType: targetNode.nodeType,
        parentId: targetNode.parentId,
      },
      allNodes: meta.allDecisions,
      depthInstruction: depthInstructions[depth] || depthInstructions.concise,
    })

    // Signal async — Claude Code creates nodes via MCP, no placeholder needed
    return {
      artifacts: [],
      childContent: '',
      childNodeType: '',
      _async: true,
    } as DispatchResult & { _async: boolean }
  },
})
