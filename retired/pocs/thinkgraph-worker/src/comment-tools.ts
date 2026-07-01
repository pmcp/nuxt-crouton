/**
 * Comment-tools — Pi tool definitions for opening and replying to comment
 * threads on the per-node block editor.
 *
 * These tools are the worker-side half of PR 3 of the notion-slideover series.
 * They give Pi skills the ability to open anchored comment threads, append
 * replies, and mark threads resolved on the same `Y.Doc` that the browser's
 * TipTap editor binds to. Threads live in `commentsMap` (a `Y.Map<CommentThread>`)
 * alongside the editor fragment, so a single page room round-trips both
 * content and discussion.
 *
 * Calls go through `YjsPagePool` so a Pi run that opens a thread and then
 * replies to it reuses the same socket. Idle close handled by the pool.
 *
 * Like page-tools, these tools are stateless — Pi names the target node id
 * explicitly on every call. The dispatched node id is the common case.
 */
import { Type } from '@sinclair/typebox'
import type { ToolDefinition, AgentToolResult } from '@mariozechner/pi-coding-agent'
import type { YjsPagePool } from './yjs-pool.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyToolDefinition = ToolDefinition<any, any>

function textResult(text: string): AgentToolResult<unknown> {
  return { content: [{ type: 'text', text }], details: undefined }
}

/**
 * Build the comment-tools tool set for a session.
 * `defaultNodeId` is the dispatched node — used when the model omits the
 * `nodeId` parameter on a call.
 */
export function createCommentTools(
  pagePool: YjsPagePool,
  teamId: string,
  defaultNodeId: string,
): AnyToolDefinition[] {
  return [
    {
      name: 'open_comment',
      label: 'Open Comment',
      description: 'Open a new comment thread anchored to a quoted snippet of text inside a ThinkGraph node\'s editor. Use this when you want to call out a specific passage — to flag a question, suggest a change, or start a focused discussion. The browser draws a highlight on the matching range and shows the thread in the comment slideout. The quote must appear verbatim in the editor; pick a distinctive snippet so the anchor is unambiguous. Returns the threadId, which you can pass to reply_to_comment to add follow-up messages to the same thread.',
      parameters: Type.Object({
        quote: Type.String({ description: 'Verbatim text from the editor that the thread anchors to. Must match exactly (whitespace, punctuation, casing). Pick a distinctive 5-15 word snippet to avoid matching the wrong occurrence.' }),
        body: Type.String({ description: 'The first message in the thread. Plain text. Markdown is rendered on the browser side.' }),
        occurrence: Type.Optional(Type.Integer({ description: 'Which match of `quote` to anchor to (0-indexed). Defaults to 0 — the first occurrence wins. Only set this if you know the same snippet appears multiple times.', minimum: 0 })),
        authorLabel: Type.Optional(Type.String({ description: 'Display label for the author. Defaults to "Pi". Override only when impersonating a named persona.' })),
        nodeId: Type.Optional(Type.String({ description: 'Target node id. Defaults to the dispatched node.' })),
      }),
      execute: async (_toolCallId, params) => {
        const nodeId = params.nodeId || defaultNodeId
        try {
          const client = await pagePool.acquire(teamId, nodeId)
          const threadId = `comment-${crypto.randomUUID()}`
          client.openComment(
            threadId,
            { quote: params.quote, occurrence: params.occurrence ?? 0 },
            { body: params.body, author: 'pi', authorLabel: params.authorLabel },
          )
          pagePool.touch(teamId, nodeId)
          return textResult(JSON.stringify({ ok: true, nodeId, threadId }))
        } catch (err: any) {
          console.error(`[comment-tools] open_comment failed:`, err.message)
          return textResult(JSON.stringify({ ok: false, error: err.message }))
        }
      },
    },
    {
      name: 'reply_to_comment',
      label: 'Reply to Comment',
      description: 'Append a reply message to an existing comment thread. Use the threadId returned by open_comment, or one you observed on a thread the human opened. Fails gracefully (returns ok: false) if the thread no longer exists — threads can only be opened, never deleted, so a missing thread usually means a stale id from a different node.',
      parameters: Type.Object({
        threadId: Type.String({ description: 'Thread id from a prior open_comment call or from an inbound human-opened thread.' }),
        body: Type.String({ description: 'The reply message body. Plain text; markdown is rendered on the browser side.' }),
        authorLabel: Type.Optional(Type.String({ description: 'Display label for the author. Defaults to "Pi".' })),
        nodeId: Type.Optional(Type.String({ description: 'Target node id. Defaults to the dispatched node.' })),
      }),
      execute: async (_toolCallId, params) => {
        const nodeId = params.nodeId || defaultNodeId
        try {
          const client = await pagePool.acquire(teamId, nodeId)
          const ok = client.replyToComment(params.threadId, {
            body: params.body,
            author: 'pi',
            authorLabel: params.authorLabel,
          })
          pagePool.touch(teamId, nodeId)
          if (!ok) {
            return textResult(JSON.stringify({ ok: false, error: `thread ${params.threadId} not found on node ${nodeId}` }))
          }
          return textResult(JSON.stringify({ ok: true, nodeId, threadId: params.threadId }))
        } catch (err: any) {
          console.error(`[comment-tools] reply_to_comment failed:`, err.message)
          return textResult(JSON.stringify({ ok: false, error: err.message }))
        }
      },
    },
    {
      name: 'resolve_comment',
      label: 'Resolve Comment',
      description: 'Mark a comment thread as resolved. Idempotent — calling on an already-resolved thread is a no-op success. Use this once the discussion is complete and the thread no longer needs human attention. The browser dims the highlight and moves the thread to the resolved section of the slideout. Resolved threads can still be read; this is not a delete.',
      parameters: Type.Object({
        threadId: Type.String({ description: 'Thread id to resolve.' }),
        nodeId: Type.Optional(Type.String({ description: 'Target node id. Defaults to the dispatched node.' })),
      }),
      execute: async (_toolCallId, params) => {
        const nodeId = params.nodeId || defaultNodeId
        try {
          const client = await pagePool.acquire(teamId, nodeId)
          const ok = client.resolveComment(params.threadId)
          pagePool.touch(teamId, nodeId)
          if (!ok) {
            return textResult(JSON.stringify({ ok: false, error: `thread ${params.threadId} not found on node ${nodeId}` }))
          }
          return textResult(JSON.stringify({ ok: true, nodeId, threadId: params.threadId }))
        } catch (err: any) {
          console.error(`[comment-tools] resolve_comment failed:`, err.message)
          return textResult(JSON.stringify({ ok: false, error: err.message }))
        }
      },
    },
  ]
}
