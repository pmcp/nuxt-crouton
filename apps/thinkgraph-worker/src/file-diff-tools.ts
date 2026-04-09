/**
 * File-diff-tools — Pi tool definition for appending inline file-diff blocks
 * into the per-node Notion-style editor.
 *
 * PR 4 of the notion-slideover series. This tool is the worker-side half of
 * the FileDiffBlock surface: Pi passes a standard unified diff string plus a
 * file path, and the block appears in real-time in any open browser editor
 * for that node. Read-only — Pi proposes, humans read. No apply pathway ships
 * in this tool or its NodeView.
 *
 * Shares the page pool with `page-tools` and `comment-tools` so a skill that
 * writes a paragraph, appends an action button, opens a comment thread, and
 * drops a file diff all reuse the same socket to the page room.
 *
 * Stateless — Pi names the target node id explicitly on every call. The
 * dispatched node id is the common case and is used when `nodeId` is omitted.
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
 * Build the file-diff tool set for a session.
 * `defaultNodeId` is the dispatched node — used when the model omits the
 * `nodeId` parameter on a call.
 */
export function createFileDiffTools(
  pagePool: YjsPagePool,
  teamId: string,
  defaultNodeId: string,
): AnyToolDefinition[] {
  return [
    {
      name: 'append_file_diff',
      label: 'Append File Diff',
      description: 'Show a unified diff inline in a ThinkGraph node\'s editor. Use this to propose a concrete code change alongside the prose describing it — the block renders as a collapsible panel with +/− line coloring. The diff is read-only; if you want the human to act on it, append a separate action button next to it via append_action_button. Prefer one file per call — chain multiple calls for multi-file changes so each file gets its own collapsible panel.',
      parameters: Type.Object({
        filePath: Type.String({ description: 'Path of the file the diff applies to. Used as the panel header. Relative paths preferred (e.g. "src/foo.ts", not "/Users/.../src/foo.ts").' }),
        diff: Type.String({ description: 'Unified diff text. Standard +/− line prefixes; @@ hunk headers supported. Newlines preserved verbatim. Generate via `git diff` or an equivalent unified-diff producer — do not hand-craft.' }),
        language: Type.Optional(Type.String({ description: 'Language hint for syntax highlighting (e.g. "typescript", "vue", "python"). If omitted, the browser auto-detects from the file extension. Use plain language slugs, not file extensions.' })),
        collapsed: Type.Optional(Type.Boolean({ description: 'Initial collapsed state. Default false. Set true for very large diffs to keep the editor scrollable.' })),
        nodeId: Type.Optional(Type.String({ description: 'Target node id. Defaults to the dispatched node.' })),
      }),
      execute: async (_toolCallId, params) => {
        const nodeId = params.nodeId || defaultNodeId
        try {
          const client = await pagePool.acquire(teamId, nodeId)
          client.appendFileDiff({
            filePath: params.filePath,
            diff: params.diff,
            language: params.language,
            collapsed: params.collapsed ?? false,
          })
          pagePool.touch(teamId, nodeId)
          return textResult(JSON.stringify({ ok: true, nodeId, filePath: params.filePath, bytes: params.diff.length }))
        } catch (err: any) {
          console.error(`[file-diff-tools] append_file_diff failed:`, err.message)
          return textResult(JSON.stringify({ ok: false, error: err.message }))
        }
      },
    },
  ]
}
