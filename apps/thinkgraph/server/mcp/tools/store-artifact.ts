import { z } from 'zod'
import { getAllThinkgraphDecisions, updateThinkgraphDecision } from '~~/layers/thinkgraph/collections/decisions/server/database/queries'
import { resolveTeamId } from '../utils/resolve-team'

export default defineMcpTool({
  description: 'Attach an artifact (image, code, diagram, URL, text) to an existing node. Appends to the node\'s artifacts array — does not replace existing artifacts. Use this to store results from external tools back into the thinking graph.',
  inputSchema: {
    teamId: z.string().describe('Team ID or slug'),
    nodeId: z.string().describe('The node to attach the artifact to'),
    type: z.enum(['image', 'code', 'prototype', 'text']).describe('Artifact type'),
    provider: z.string().optional().describe('What created this artifact (e.g., "excalidraw", "dalle3", "claude", "mermaid")'),
    url: z.string().optional().describe('External URL (for images, hosted diagrams)'),
    content: z.string().optional().describe('Raw content (code, HTML, Mermaid markup, Excalidraw JSON, text)'),
    prompt: z.string().optional().describe('The prompt that generated this artifact'),
    metadata: z.record(z.any()).optional().describe('Additional metadata (language, model, style, dimensions, etc.)'),
    sourceNodeIds: z.array(z.string()).optional().describe('IDs of nodes that contributed to this artifact (for synthesis)'),
  },
  async handler({ teamId, nodeId, type, provider, url, content, prompt, metadata, sourceNodeIds }) {
    try {
      if (!url && !content) {
        return { content: [{ type: 'text' as const, text: 'Either url or content must be provided' }], isError: true }
      }

      const resolvedTeamId = await resolveTeamId(teamId)

      const all = await getAllThinkgraphDecisions(resolvedTeamId)
      const node = all.find((d: any) => d.id === nodeId)
      if (!node) {
        return { content: [{ type: 'text' as const, text: `Node "${nodeId}" not found` }], isError: true }
      }

      const existingArtifacts = Array.isArray(node.artifacts) ? node.artifacts : []
      const newArtifact = {
        type,
        ...(provider && { provider }),
        ...(url && { url }),
        ...(content && { content }),
        ...(prompt && { prompt }),
        ...(metadata && { metadata }),
        ...(sourceNodeIds?.length && { sourceNodeIds }),
        createdAt: new Date().toISOString(),
      }

      const updatedArtifacts = [...existingArtifacts, newArtifact]

      await updateThinkgraphDecision(nodeId, resolvedTeamId, 'mcp', { artifacts: updatedArtifacts as any }, { role: 'admin' })

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            stored: true,
            nodeId,
            artifactIndex: updatedArtifacts.length - 1,
            totalArtifacts: updatedArtifacts.length,
            artifactType: type,
          }, null, 2),
        }],
      }
    }
    catch (error: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    }
  },
})
