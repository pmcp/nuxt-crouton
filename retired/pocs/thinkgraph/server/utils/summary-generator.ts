/**
 * Auto-generates ~50 token summaries for ThinkGraph nodes.
 *
 * Called non-blocking (fire-and-forget) from pipeline touchpoints:
 * - pm-tools update_workitem (when output is set)
 * - webhook.post.ts (after stage-output artifact creation)
 * - create-node MCP tool (when brief is provided)
 */
import { generateText } from 'ai'
import { updateThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'
import { indexNodeAsync } from './embeddings'

/**
 * Generate an AI summary for a node and store it in the summary field.
 * Non-blocking — errors are logged but don't propagate.
 */
export async function generateNodeSummary(
  nodeId: string,
  teamId: string,
  content: string,
): Promise<void> {
  if (!content || content.trim().length < 10) return

  try {
    const ai = createAIProvider()
    const { text } = await generateText({
      model: ai.model('claude-haiku-4-5-20251001'),
      maxTokens: 60,
      messages: [
        {
          role: 'user',
          content: `Summarize this in one sentence (max 50 tokens). Be specific and factual — capture the core action or decision, not vague descriptions.\n\n${content.slice(0, 2000)}`,
        },
      ],
    })

    const summary = text.trim()
    if (summary) {
      await updateThinkgraphNode(nodeId, teamId, 'system', { summary }, { role: 'admin' })
      // Phase 2B: keep the Vectorize index in sync whenever node text changes.
      // Fire-and-forget — same fail-soft semantics as summary generation.
      indexNodeAsync(nodeId, teamId)
    }
  }
  catch (err) {
    console.error(`[summary-generator] Failed for node ${nodeId}:`, err instanceof Error ? err.message : err)
  }
}

/**
 * Fire-and-forget wrapper — kicks off summary generation without awaiting.
 * Use this at pipeline touchpoints to avoid stalling the pipeline.
 */
export function generateNodeSummaryAsync(
  nodeId: string,
  teamId: string,
  content: string,
): void {
  generateNodeSummary(nodeId, teamId, content).catch(() => {
    // Already logged inside generateNodeSummary
  })
}
