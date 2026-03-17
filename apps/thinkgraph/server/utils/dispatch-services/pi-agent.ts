import { registerDispatchService } from '../dispatch-registry'
import { buildDispatchContext } from '../context-builder'
import { createTerminalSession } from '../terminal-sessions'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'
import { updateThinkgraphDecision } from '~~/layers/thinkgraph/collections/decisions/server/database/queries'

registerDispatchService({
  id: 'pi-agent',
  name: 'Pi Agent',
  description: 'Send to Pi coding agent — runs on Raspberry Pi with full project context',
  type: 'code',
  icon: 'i-lucide-cpu',
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
      throw createError({ status: 500, statusText: 'Pi Agent requires dispatch metadata' })
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

    // Build the full context for the Pi worker
    const builtContext = buildDispatchContext(
      {
        id: meta.decisionId,
        content: targetNode.content,
        nodeType: targetNode.nodeType,
        parentId: targetNode.parentId,
      },
      meta.allDecisions,
    )

    // Store handoff metadata on the node's artifacts for the Pi worker to read
    const handoffMeta = {
      type: 'handoff' as const,
      service: 'pi-agent',
      depth,
      depthInstruction: depthInstructions[depth] || depthInstructions.concise,
      prompt: context.prompt || '',
      context: builtContext,
      teamSlug: meta.teamSlug,
      graphId: meta.graphId,
      nodeId: meta.decisionId,
      nodeContent: targetNode.content,
      nodeType: targetNode.nodeType,
    }

    // Create terminal session so the UI can start showing status immediately
    createTerminalSession(meta.decisionId)

    // Update node: set status to 'dispatching' and store handoff metadata
    const existingArtifacts = Array.isArray(targetNode.artifacts) ? targetNode.artifacts : []
    // Remove any previous handoff artifacts
    const cleanedArtifacts = existingArtifacts.filter((a: any) => a?.type !== 'handoff')

    await updateThinkgraphDecision(
      meta.decisionId,
      meta.teamId,
      'system',
      {
        status: 'dispatching',
        artifacts: [...cleanedArtifacts, handoffMeta],
      } as any,
      { role: 'admin' },
    )

    // Signal change so Yjs broadcasts to Pi worker
    signalCollectionChange(meta.teamId, 'thinkgraphDecisions')

    // Signal async — Pi worker picks up via Yjs and creates nodes via HTTP API
    return {
      artifacts: [],
      childContent: '',
      childNodeType: '',
      _async: true,
    } as DispatchResult & { _async: boolean }
  },
})
