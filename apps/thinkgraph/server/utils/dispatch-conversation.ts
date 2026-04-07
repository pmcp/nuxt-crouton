/**
 * Dispatch conversation roundup.
 *
 * When a node dispatches to Pi (or any executor), we want to hand off the
 * per-node chat conversation as part of the execution context. Raw transcripts
 * are noisy and may not fit smaller context windows, so this module produces a
 * structured roundup (Goal / Decisions / Constraints / Open questions / Next
 * steps) via the same AI provider used by the chat endpoint.
 *
 * Caching:
 *   The roundup is cached on the conversation row's `metadata.dispatchSummary`,
 *   keyed by `metadata.dispatchSummaryHash` — a hash of the messages array.
 *   On subsequent dispatches with no new messages, we reuse the cached summary.
 *
 * Fallback:
 *   If summarization fails (network, rate limit, missing API key), we fall back
 *   to a deterministic truncation of the raw transcript that preserves user
 *   messages, DECISION lines, and the most recent assistant turn. Dispatch
 *   never blocks on summarization failure.
 *
 * The summarizer model and the executor model don't have to be the same. The
 * output is provider-agnostic markdown.
 */

import { createHash } from 'node:crypto'
import { generateText } from 'ai'
import type { H3Event } from 'h3'
import { eq, and } from 'drizzle-orm'
import { thinkgraphChatConversations } from '~~/layers/thinkgraph/collections/chatconversations/server/database/schema'

/** Max tokens reserved for the conversation block in the dispatch payload. */
export const CONVERSATION_TOKEN_BUDGET = 2000

/** ~4 chars per token, matches estimateTokens in context-builder.ts */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system' | string
  content: string
  id?: string
  createdAt?: string | number | Date
}

export type SummaryStatus = 'fresh' | 'cached' | 'fallback-truncated' | 'none'

export interface ConversationRoundup {
  status: SummaryStatus
  /** Markdown block ready to drop into the dispatch context, or empty string if no conversation. */
  markdown: string
  tokenEstimate: number
}

/**
 * Get the per-node conversation row (if any) along with its parsed messages.
 * Returns null if there is no conversation for this node yet.
 */
async function loadNodeConversation(teamId: string, nodeId: string): Promise<{
  id: string
  messages: ChatMessage[]
  metadata: any
} | null> {
  const db = useDB() as any

  const rows = await db
    .select({
      id: thinkgraphChatConversations.id,
      messages: thinkgraphChatConversations.messages,
      metadata: thinkgraphChatConversations.metadata,
    })
    .from(thinkgraphChatConversations)
    .where(
      and(
        eq(thinkgraphChatConversations.teamId, teamId),
        eq(thinkgraphChatConversations.nodeId, nodeId),
      ),
    )
    .limit(1)

  const row = rows[0]
  if (!row) return null

  // Messages may come back as a parsed object (custom JSON column) or a string
  let messages: ChatMessage[] = []
  if (Array.isArray(row.messages)) {
    messages = row.messages
  }
  else if (typeof row.messages === 'string') {
    try {
      const parsed = JSON.parse(row.messages)
      if (Array.isArray(parsed)) messages = parsed
    }
    catch {
      messages = []
    }
  }

  let metadata: any = row.metadata
  if (typeof metadata === 'string') {
    try { metadata = JSON.parse(metadata) }
    catch { metadata = {} }
  }
  if (!metadata || typeof metadata !== 'object') metadata = {}

  return { id: row.id, messages, metadata }
}

/** Stable hash of the messages array — used as the cache key for the roundup. */
function hashMessages(messages: ChatMessage[]): string {
  // Normalize to role+content only — id and timestamps shouldn't bust the cache
  const normalized = messages.map(m => ({ role: m.role, content: m.content }))
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 32)
}

/** Persist the cached roundup back onto the conversation row's metadata. */
async function cacheRoundup(
  conversationId: string,
  existingMetadata: any,
  hash: string,
  summary: string,
): Promise<void> {
  const db = useDB() as any
  const newMetadata = {
    ...(existingMetadata || {}),
    dispatchSummary: summary,
    dispatchSummaryHash: hash,
    dispatchSummaryAt: new Date().toISOString(),
  }
  try {
    await db
      .update(thinkgraphChatConversations)
      .set({ metadata: newMetadata })
      .where(eq(thinkgraphChatConversations.id, conversationId))
  }
  catch (err: any) {
    // Caching is best-effort — if the write fails, the next dispatch will just regenerate
    console.warn('[dispatch-conversation] failed to cache roundup:', err?.message || err)
  }
}

/** Render the raw transcript verbatim as markdown. */
function renderTranscriptMarkdown(messages: ChatMessage[]): string {
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map((m) => {
      const label = m.role === 'user' ? '**User**' : '**Assistant**'
      return `${label}:\n${m.content}`
    })
    .join('\n\n')
}

/**
 * Deterministic truncation fallback. Strategy:
 *   1. Always preserve every user message
 *   2. Always preserve any assistant line containing `DECISION:` (the chat
 *      system prompt explicitly emits these as load-bearing insights)
 *   3. Always preserve the most recent assistant message in full
 *   4. Drop oldest assistant prose first to fit the budget
 *   5. If still over budget, truncate user messages from the middle (keep
 *      first + last)
 *   6. Insert markers where content was dropped
 *
 * Note: budget is a target, not a hard cap. Preserved content (user messages,
 * decisions, last assistant turn) takes precedence. A conversation with many
 * decision-rich assistant turns may exceed budget by 20-30% — that's by design.
 * This path only runs when the primary AI summarization fails; the primary
 * path naturally fits because the prompt asks the model to be terse.
 */
function truncateTranscriptToBudget(messages: ChatMessage[], budget: number): string {
  const userOrAssistant = messages.filter(m => m.role === 'user' || m.role === 'assistant')
  if (userOrAssistant.length === 0) return ''

  // Index assistant messages
  const lastAssistantIdx = (() => {
    for (let i = userOrAssistant.length - 1; i >= 0; i--) {
      if (userOrAssistant[i].role === 'assistant') return i
    }
    return -1
  })()

  const decisionLineRegex = /DECISION:\s*\{[^}]+\}/g

  type Kept = { idx: number; text: string }
  const kept: Kept[] = []

  for (let i = 0; i < userOrAssistant.length; i++) {
    const m = userOrAssistant[i]
    if (m.role === 'user') {
      kept.push({ idx: i, text: `**User**:\n${m.content}` })
      continue
    }
    // assistant
    if (i === lastAssistantIdx) {
      kept.push({ idx: i, text: `**Assistant**:\n${m.content}` })
      continue
    }
    const decisions = m.content.match(decisionLineRegex)
    if (decisions && decisions.length > 0) {
      kept.push({ idx: i, text: `**Assistant** (decisions only):\n${decisions.join('\n')}` })
      continue
    }
    // Mark as droppable assistant prose
    kept.push({ idx: i, text: `**Assistant**:\n${m.content}` })
  }

  // First pass: drop oldest assistant prose (not last assistant, not decision-only) until under budget
  function isDroppableProse(k: Kept): boolean {
    const m = userOrAssistant[k.idx]
    if (m.role !== 'assistant') return false
    if (k.idx === lastAssistantIdx) return false
    if (k.text.startsWith('**Assistant** (decisions only)')) return false
    return true
  }

  function joined(parts: Kept[]): string {
    return parts.map(p => p.text).join('\n\n')
  }

  let parts = [...kept]
  let droppedAssistantCount = 0

  while (estimateTokens(joined(parts)) > budget) {
    // Find oldest droppable assistant prose
    const idx = parts.findIndex(isDroppableProse)
    if (idx === -1) break
    parts.splice(idx, 1)
    droppedAssistantCount++
  }

  if (droppedAssistantCount > 0) {
    // Insert a single marker near the start of where we dropped
    const insertIdx = parts.findIndex(p => userOrAssistant[p.idx].role === 'assistant')
    const marker: Kept = {
      idx: -1,
      text: `_[... ${droppedAssistantCount} earlier assistant message${droppedAssistantCount > 1 ? 's' : ''} omitted to fit budget ...]_`,
    }
    if (insertIdx === -1) parts.push(marker)
    else parts.splice(insertIdx, 0, marker)
  }

  // Second pass: if still over, truncate user messages from the middle
  if (estimateTokens(joined(parts)) > budget) {
    const userIndices = parts
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.idx !== -1 && userOrAssistant[p.idx]?.role === 'user')
      .map(({ i }) => i)

    if (userIndices.length > 2) {
      // Drop middle user messages
      const middleStart = userIndices[1]
      const middleEnd = userIndices[userIndices.length - 2]
      const middleCount = userIndices.length - 2
      parts.splice(middleStart, middleEnd - middleStart + 1, {
        idx: -1,
        text: `_[... ${middleCount} user message${middleCount > 1 ? 's' : ''} omitted to fit budget ...]_`,
      })
    }
  }

  return joined(parts)
}

const ROUNDUP_SYSTEM_PROMPT = `You are summarizing a thinking-partner chat conversation that happened on a single node of a thinking graph. The user is about to dispatch this node to an executor agent (which may or may not have access to this conversation directly). Produce a structured handoff brief so the executor knows what was decided, what to avoid, and what's still open.

Output format (markdown, no preamble):

## Goal
One paragraph: what the user is ultimately trying to accomplish on this node.

## Decisions made
Bullet list of concrete decisions reached during the conversation. Include the reasoning when it matters.

## Constraints
Bullet list of constraints, requirements, or things to avoid that came up. Include rejected approaches and WHY they were rejected — these are the most valuable signal for the executor.

## Open questions
Bullet list of things that were raised but not resolved. Empty if none.

## Recommended next steps
Bullet list of what the executor should do, in order. Be concrete.

Be terse. No filler. If a section has nothing, write "(none)". Do not invent content not present in the conversation.`

/** Generate a fresh roundup via the AI provider. Returns null if generation fails. */
async function generateRoundup(event: H3Event, messages: ChatMessage[]): Promise<string | null> {
  try {
    const ai = createAIProvider(event)
    const model = ai.getDefaultModel()

    const transcript = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`)
      .join('\n\n')

    const result = await generateText({
      model: ai.model(model),
      system: ROUNDUP_SYSTEM_PROMPT,
      prompt: `Summarize this conversation into the structured handoff brief described in the system prompt.\n\n---\n\n${transcript}`,
    })
    const text = result?.text?.trim()
    return text || null
  }
  catch (err: any) {
    console.warn('[dispatch-conversation] roundup generation failed:', err?.message || err)
    return null
  }
}

/**
 * Build a conversation roundup for dispatch.
 *
 * Resolution order:
 *   1. No conversation row / no messages → status 'none', empty markdown
 *   2. Cached roundup with matching message hash → 'cached'
 *   3. Fresh AI-generated roundup → 'fresh' (and write back to cache)
 *   4. AI generation failed → 'fallback-truncated' (deterministic truncation)
 */
export async function buildConversationRoundup(
  event: H3Event,
  teamId: string,
  nodeId: string,
): Promise<ConversationRoundup> {
  const conv = await loadNodeConversation(teamId, nodeId)
  if (!conv || conv.messages.length === 0) {
    return { status: 'none', markdown: '', tokenEstimate: 0 }
  }

  const hash = hashMessages(conv.messages)

  // Cache hit
  const cachedSummary = conv.metadata?.dispatchSummary
  const cachedHash = conv.metadata?.dispatchSummaryHash
  if (cachedSummary && cachedHash === hash) {
    const markdown = `## Conversation roundup (cached)\n\n${cachedSummary}`
    return { status: 'cached', markdown, tokenEstimate: estimateTokens(markdown) }
  }

  // Fresh generation
  const fresh = await generateRoundup(event, conv.messages)
  if (fresh) {
    // Cache for next dispatch (best-effort)
    await cacheRoundup(conv.id, conv.metadata, hash, fresh)
    const markdown = `## Conversation roundup\n\n${fresh}`
    return { status: 'fresh', markdown, tokenEstimate: estimateTokens(markdown) }
  }

  // Fallback: deterministic truncation of the raw transcript
  const fitsRaw = estimateTokens(renderTranscriptMarkdown(conv.messages)) <= CONVERSATION_TOKEN_BUDGET
  const transcript = fitsRaw
    ? renderTranscriptMarkdown(conv.messages)
    : truncateTranscriptToBudget(conv.messages, CONVERSATION_TOKEN_BUDGET)

  const markdown = `## Conversation transcript (fallback — summarization unavailable)\n\n${transcript}`
  return { status: 'fallback-truncated', markdown, tokenEstimate: estimateTokens(markdown) }
}
