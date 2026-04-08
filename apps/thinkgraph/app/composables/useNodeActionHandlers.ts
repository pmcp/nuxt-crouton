/**
 * useNodeActionHandlers — registry of action-button handlers, scoped via
 * Vue's provide/inject so each NodeBlockEditor instance carries its own
 * (nodeId, teamId) context. PR 2 of the notion-slideover series.
 *
 * Pi appends `actionButton` blocks via `pi.appendActionButton`. The block
 * carries a `kind` string ("create-child" today, more in later PRs) and an
 * arbitrary payload. When a human clicks the button, the NodeView component
 * calls `useNodeActionHandlers().run(kind, payload, controls)` which looks up
 * the handler, runs it with the slideover's context, and updates the button's
 * `consumed` attr so it can re-render in its done state.
 *
 * Why provide/inject (and not a singleton store):
 *   - Multiple slideovers can be open in parallel (e.g. side-by-side tabs).
 *     Each gets its own injection scope, so a click in slideover A never
 *     fires the handler with slideover B's nodeId.
 *   - Tests can wrap the component tree with a mock provider and assert
 *     handler calls without monkey-patching globals.
 *
 * Why not push handlers onto extension storage:
 *   - The brief explicitly requires the composable + provide/inject pattern.
 *     Vue 3 + @tiptap/vue-3 propagates parent provide context into NodeView
 *     components via `editor.contentComponent`, so injection works across
 *     the VueNodeViewRenderer boundary.
 */
import type { InjectionKey } from 'vue'
import { inject, provide } from 'vue'

/**
 * Context passed to every action handler — identifies the slideover the
 * button was clicked from and gives the handler a way to ask the editor to
 * mark the block consumed once the side effect succeeds.
 */
export interface NodeActionContext {
  /** Node id whose editor the button lives in */
  nodeId: string
  /** Team id used for API calls and team membership */
  teamId: string
}

/**
 * Per-click controls passed to a handler — separate from the context
 * because the editor instance and the consume callback are click-scoped.
 */
export interface NodeActionControls {
  /**
   * Mark the clicked button as consumed. The handler should call this on
   * success so subsequent clicks no-op and the NodeView re-renders in its
   * done state.
   */
  markConsumed: (extra?: Record<string, unknown>) => void
}

export type NodeActionHandler = (
  ctx: NodeActionContext,
  payload: Record<string, unknown>,
  controls: NodeActionControls,
) => Promise<void> | void

export interface NodeActionRegistry {
  ctx: NodeActionContext
  handlers: Record<string, NodeActionHandler>
}

const NODE_ACTION_HANDLERS_KEY: InjectionKey<NodeActionRegistry> = Symbol('node-action-handlers')

/**
 * Default handlers shipped with PR 2.
 *
 * Adding a new kind in PR 3+ is a one-line edit here — no extension changes,
 * no schema migration, just register the kind and have Pi append it.
 */
function buildDefaultHandlers(): Record<string, NodeActionHandler> {
  return {
    /**
     * create-child — POSTs a new node to the existing thinkgraph-nodes
     * endpoint with `parentId = ctx.nodeId`. Title and brief come from the
     * button's payload (set by Pi when it appended the button).
     */
    'create-child': async (ctx, payload, controls) => {
      const title = typeof payload.title === 'string' ? payload.title : null
      if (!title) {
        console.warn('[useNodeActionHandlers] create-child: missing title in payload')
        return
      }

      const body: Record<string, unknown> = {
        parentId: ctx.nodeId,
        title,
      }
      if (typeof payload.brief === 'string') body.brief = payload.brief
      if (typeof payload.template === 'string') body.template = payload.template
      if (Array.isArray(payload.steps)) body.steps = payload.steps
      if (typeof payload.assignee === 'string') body.assignee = payload.assignee

      try {
        const created = await $fetch<{ id: string; title: string }>(
          `/api/teams/${ctx.teamId}/thinkgraph-nodes`,
          { method: 'POST', body },
        )
        controls.markConsumed({
          createdNodeId: created.id,
          createdTitle: created.title,
        })
      } catch (err) {
        console.error('[useNodeActionHandlers] create-child failed', err)
      }
    },
  }
}

/**
 * Provide a node-action registry to descendant components (NodeView,
 * slash-menu items, etc.). Call this once from the slideover's editor
 * wrapper component (NodeBlockEditor.vue).
 */
export function provideNodeActionHandlers(ctx: NodeActionContext): NodeActionRegistry {
  const registry: NodeActionRegistry = {
    ctx,
    handlers: buildDefaultHandlers(),
  }
  provide(NODE_ACTION_HANDLERS_KEY, registry)
  return registry
}

/**
 * Resolve the registry for the closest enclosing NodeBlockEditor.
 * Returns `null` if called outside of a slideover (e.g. when an action button
 * block ends up rendered in a context that doesn't provide handlers — the
 * NodeView falls back to a disabled state in that case).
 */
export function useNodeActionHandlers(): NodeActionRegistry | null {
  return inject(NODE_ACTION_HANDLERS_KEY, null)
}
