/**
 * Page-tools — Pi tool definitions for writing into the per-node block editor.
 *
 * These tools are the worker-side half of PR 2 of the notion-slideover series.
 * They give Pi skills the ability to append paragraph and action-button blocks
 * directly into the same Y.XmlFragment that the browser slideover's TipTap
 * editor is bound to. Calls go through `YjsPagePool` so connections are
 * reused across multiple appends in the same Pi run and idle out automatically.
 *
 * Both tools are stateless — Pi names the target node id explicitly on every
 * call. The dispatched node id is the common case, but a skill that touches
 * multiple nodes (e.g. a planner appending notes onto each child) can target
 * any node it knows about.
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
 * Build the page-tools tool set for a session.
 * `defaultNodeId` is the dispatched node — used when the model omits the
 * `nodeId` parameter on a call.
 */
export function createPageTools(
  pagePool: YjsPagePool,
  teamId: string,
  defaultNodeId: string,
): AnyToolDefinition[] {
  return [
    {
      name: 'append_block',
      label: 'Append Block',
      description: 'Append a paragraph block to the live Notion-style editor on a ThinkGraph node. Use this to write prose, observations, or reasoning into the node\'s document — it appears in real time in any open browser slideover for that node and persists across reloads. Prefer one paragraph per logical thought; chain multiple calls for multi-paragraph passages.',
      parameters: Type.Object({
        text: Type.String({ description: 'Plain-text paragraph to append. Newlines inside the text are kept as-is by the editor; for multiple paragraphs make multiple calls.' }),
        nodeId: Type.Optional(Type.String({ description: 'Target node id. Defaults to the dispatched node.' })),
      }),
      execute: async (_toolCallId, params) => {
        const nodeId = params.nodeId || defaultNodeId
        try {
          const client = await pagePool.acquire(teamId, nodeId)
          client.appendParagraph(params.text)
          pagePool.touch(teamId, nodeId)
          return textResult(JSON.stringify({ ok: true, nodeId, length: params.text.length }))
        } catch (err: any) {
          console.error(`[page-tools] append_block failed:`, err.message)
          return textResult(JSON.stringify({ ok: false, error: err.message }))
        }
      },
    },
    {
      name: 'append_action_button',
      label: 'Append Action Button',
      description: 'Append an inert action button into a node\'s editor. Buttons are how Pi proposes follow-up work without polluting the canvas — humans click them to materialize the action. Use this when you have a concrete next step the user might want to take. The only kind shipped today is "create-child", which creates a new child node from a title + brief when clicked. Unknown kinds are silently ignored by the browser, so do not invent new kinds.',
      parameters: Type.Object({
        label: Type.String({ description: 'Visible button label, e.g. "Create child node: API spike"' }),
        kind: Type.String({ description: 'Action kind — currently only "create-child" is implemented.' }),
        icon: Type.Optional(Type.String({ description: 'Lucide icon name, e.g. "i-lucide-plus" (default)' })),
        payload: Type.Optional(Type.Object({}, { additionalProperties: true, description: 'Action-specific payload. For create-child: { title: string, brief?: string, template?: string }.' })),
        nodeId: Type.Optional(Type.String({ description: 'Target node id. Defaults to the dispatched node.' })),
      }),
      execute: async (_toolCallId, params) => {
        const nodeId = params.nodeId || defaultNodeId
        try {
          const client = await pagePool.acquire(teamId, nodeId)
          client.appendActionButton({
            label: params.label,
            icon: params.icon || 'i-lucide-plus',
            kind: params.kind,
            payload: (params.payload as Record<string, unknown> | undefined) ?? {},
          })
          pagePool.touch(teamId, nodeId)
          return textResult(JSON.stringify({ ok: true, nodeId, kind: params.kind }))
        } catch (err: any) {
          console.error(`[page-tools] append_action_button failed:`, err.message)
          return textResult(JSON.stringify({ ok: false, error: err.message }))
        }
      },
    },
  ]
}
