---
title: PR 2 — ActionButtonBlock + pi.appendBlock + create-child handler
status: 🟡 ready for dispatch
created: 2026-04-08
parent: notion-slideover-brief.md
related:
  - notion-slideover-brief.md (PR plan, PR 1 shipped)
  - thinkgraph-assistant-brief.md (Step 1 — Node conversations)
---

# PR 2 — ActionButtonBlock + pi.appendBlock + create-child action handler

Second PR in the Notion-style slideover series. PR 1 shipped a Yjs-backed
block editor inside the slideover; Pi still writes opaque text into the
flat `output` field. This PR turns Pi into a real document collaborator:
it can append blocks (prose, action buttons) into the live Yjs fragment
of any node, and humans click buttons to materialize side effects (the
first being "create child node").

The user's hard rule from the parent brief: **only humans create child
nodes**. Pi proposes via inert action buttons; humans click. This keeps
the canvas clean (only intentional work shows up as cards) and gives Pi
unlimited room to reason in the doc without polluting the graph.

## Why

After PR 1, the slideover has a real editor but it's a one-way street:
humans type, Pi writes to a separate `output` text blob that renders
below. The dispatch pipeline still produces a flat string that the user
mentally has to stitch together with the brief and the chat panel. Pi
can't propose next steps in a way the human can act on without copy-paste.

PR 2 closes the loop. The flow becomes:

1. Human writes a brief in the editor or in the brief field
2. Sends to Pi
3. Pi runs its skill, then writes prose blocks + 1-N action buttons into
   the same per-node Yjs fragment via a new `pi.appendBlock` worker tool
4. Human reads Pi's reasoning inline, clicks an action button to spawn
   a child node (or accept a fix, or run a follow-up dispatch — extensible)
5. Other action button kinds get added in later PRs as needs surface

The architecture supports this for free because PR 1 already opened a
per-node `page`-type collab room scoped by `thinkgraph-node-${teamId}-${nodeId}`.
The browser editor and the Pi worker both connect as Yjs clients. Conflict
resolution is handled by Yjs CRDTs.

## What changes

| Surface | New |
|---|---|
| `apps/thinkgraph-worker/src/` | New `YjsPageClient` (or extension to `YjsFlowClient`) that connects to `page`-type rooms by node id, exposes `appendBlock(block)`, `appendParagraph(text)` |
| `apps/thinkgraph-worker/src/skills/` | All Pi skills get a new `appendBlock` capability injected alongside existing `updateNode` / `storeArtifact` |
| `apps/thinkgraph/app/components/Blocks/` (NEW dir) | `ActionButtonBlock.vue` — custom TipTap node, renders an inert button until clicked, then dispatches to a registered handler |
| `apps/thinkgraph/app/extensions/` (NEW dir) | TipTap extension wrapping `ActionButtonBlock` — registers `actionButton` node type, schema, NodeView, `insertActionButton` command |
| `apps/thinkgraph/app/components/NodeBlockEditor.vue` | Pass the new extension via `:extensions` prop, wire `create-child` action handler |
| `apps/thinkgraph/app/composables/` | `useNodeActionHandlers.ts` — registry of action kinds → handler functions. `create-child` is the first one |

## What does NOT change

- The existing `output` field, the chat panel, the agent activity feed,
  the artifacts array, the dispatch / pipeline / artifacts code. PR 1's
  coexistence rule still applies.
- The schema. No new collections. No new columns on `thinkgraph_nodes`.
- Existing skills don't need to change. They opt in to the new capability
  by calling `pi.appendBlock(...)` in their handlers — old skills that
  still write to `output` keep working.
- The flow Yjs room. Pi keeps writing `agentLog`/`agentStatus` to
  `node.ephemeral` on the flow room (existing `YjsFlowClient`). The new
  `YjsPageClient` is an *additional* connection scoped to a different room.

---

# PR 2 brief (dispatchable)

Add an `actionButton` block type, a `pi.appendBlock` worker capability,
and a `create-child` action handler so Pi can write proposals into the
node doc and humans can act on them with a click.

## Background

After PR 1, the ThinkGraph project-page slideover has a Notion-style
block editor backed by a per-node Yjs room (`thinkgraph-node-${teamId}-${nodeId}`,
roomType `page`). The browser uses `useCollabEditor` to bind a TipTap
editor to the room's `Y.XmlFragment('content')`. The dispatch pipeline
still writes to the flat `node.output` field — Pi cannot yet write into
the editor.

This PR closes that gap. Pi gains a worker-side method to append blocks
into any node's per-node room. We add one custom TipTap block type
(`actionButton`) that's inert until a human clicks it; clicking dispatches
to a registered action handler. The first handler — `create-child` —
calls the existing `POST /api/teams/[id]/thinkgraph-nodes` endpoint.

Action buttons are intentionally separate from "Pi creates a child node
directly". The hard rule is: only humans create child nodes. Pi proposes,
humans accept.

## Goal

After this PR ships:

1. A Pi skill can call `pi.appendBlock(nodeId, block)` from worker code.
   Within ~200ms the browser editor in any open slideover for that node
   shows the new block live (Yjs sync).
2. Pi can append `actionButton` blocks. They render as inert buttons
   inside the editor, with a label, an icon, and a `kind` like `create-child`.
3. When a human clicks an `actionButton`, the registered handler runs.
   For `create-child`: it creates a new child node via the existing API,
   marks the button as `consumed: true`, and the button re-renders in a
   "done — created node X" disabled state.
4. Buttons survive reload (the block is part of the Yjs fragment, which
   is mirrored to the row content blob via PR 1's debounced PATCH).
5. Old skills that don't call `appendBlock` keep working unchanged.

## Files you'll touch

### Worker side

- `apps/thinkgraph-worker/src/yjs-client.ts` (or new `yjs-page-client.ts`)
  Add `YjsPageClient` per the spike's recommendation. Connects to
  `page`-typed rooms, exposes `appendParagraph(text)`, `appendBlock(block)`,
  `appendActionButton({ label, icon, kind, payload })`.

- `apps/thinkgraph-worker/src/yjs-pool.ts`
  Add per-`(teamId, nodeId)` pooling for the new client (or extend the
  existing pool). Idle close after 30s of no use.

- `apps/thinkgraph-worker/src/skills/<your skill>.ts`
  Pick one skill (start with `compose` or `architect`) and have it append
  a paragraph + action button at the end of its run, in addition to its
  existing `updateNode({ output })` call. This proves the end-to-end flow
  without ripping out existing skills wholesale.

### Browser side

- `apps/thinkgraph/app/components/Blocks/ActionButtonBlock.vue` (NEW)
  Vue NodeView component. Renders a `<UButton>` with the block's label
  and icon. On click, looks up the `kind` in the action registry and
  calls the handler. Disabled when `attrs.consumed === true`.

- `apps/thinkgraph/app/extensions/action-button.ts` (NEW)
  TipTap `Node.create({...})` extension. Schema: a leaf node (no content),
  attrs: `label: string`, `icon: string`, `kind: string`,
  `payload: Record<string, unknown>`, `consumed: boolean`. Provides an
  `insertActionButton` command that the suggestion menu can call (no-arg
  variant — needed because the existing slash menu only invokes zero-arg
  commands; for a parameterized insert, the command takes the most recent
  attrs from a closure or the worker writes the block directly via Yjs).

  Renders via `VueNodeViewRenderer(ActionButtonBlock)`.

- `apps/thinkgraph/app/composables/useNodeActionHandlers.ts` (NEW)
  Registry mapping action `kind` strings to handlers:
  ```typescript
  const handlers = {
    'create-child': async (ctx, payload) => {
      // POST to /api/teams/[id]/thinkgraph-nodes with parentId = ctx.nodeId
      // mark button consumed via editor.commands.updateAttributes('actionButton', { consumed: true })
    }
  }
  ```
  Keep extensible — PRs 3-5 add more kinds.

- `apps/thinkgraph/app/components/NodeBlockEditor.vue`
  Pass the new TipTap extension via `:extensions`. Inject the action
  handler context (nodeId, teamId, editor instance) into the
  `useNodeActionHandlers` registry so the NodeView can call handlers
  with the right context.

## Files to read but not modify

- `apps/thinkgraph-worker/src/yjs-client.ts` (570 lines) — `YjsFlowClient`,
  the existing worker-side Yjs client. Mirror its WebSocket lifecycle,
  `buildWsUrl()` (already does the dev-vs-collab-worker switch),
  `generateCollabToken()` (HMAC, room-id-agnostic — works as-is for
  `page` rooms), and reconnect logic. The `nodesMap.observe(...)` block
  in the constructor is flow-specific — your page client doesn't need
  any of it (no observe, just append).
- `apps/thinkgraph-worker/src/yjs-pool.ts` (187 lines) — per-team
  connection pool that manages `YjsFlowClient` lifetimes. Decide whether
  the page client gets its own pool or extends this one with a
  `(teamId, nodeId)` key. Either is fine; pick the one that minimizes
  duplication.
- `apps/thinkgraph/app/components/NodeBlockEditor.vue` — PR 1's wrapper.
  Shows how the per-node room is named (`thinkgraph-node-${teamId}-${nodeId}`,
  roomType `page`, field `content`) — your worker client must connect
  to the same name.
- `packages/crouton-collab/server/durable-objects/CollabRoom.ts` — confirm
  `page`-type rooms accept binary updates without server-side schema
  enforcement that would reject `actionButton` Y.XmlElements. (Spoiler:
  CollabRoom is structure-agnostic, but verify before assuming.)
- `packages/crouton-editor/app/components/Blocks.vue` — see how custom
  block extensions are passed via the `:extensions` prop and registered
  with the underlying UEditor.
- `packages/crouton-charts/app/components/Blocks/ChartBlockView.vue` —
  reference for how a custom block contributes a NodeView. ActionButtonBlock
  is simpler (no property panel needed) but the NodeView pattern is
  the same.
- `apps/thinkgraph/layers/thinkgraph/collections/nodes/server/api/teams/[id]/thinkgraph-nodes/index.post.ts` —
  the create-node endpoint. The `create-child` handler calls this. No
  edits needed; just understand the body shape.
- y-prosemirror docs — for the `Y.XmlElement` ↔ ProseMirror node mapping.
  Built-in nodes like `paragraph` map to `<paragraph>text</paragraph>`;
  custom leaf nodes like `actionButton` map to `<actionButton attr="value" />`
  with attrs stored on the element.

## Hard constraints

- **DO NOT modify any file under `packages/`.** The
  `.claude/.package-edit-approved` gate is enforced. ActionButtonBlock
  lives in the thinkgraph app, not in crouton-pages or crouton-editor.
  If you discover that `CroutonEditorBlocks` rejects custom `:extensions`
  in some way that requires a packages/ edit, STOP and report.
- **DO NOT touch the existing `output` field, the dispatch pipeline,
  the chat panel, the agent activity feed, or the artifacts code.**
  PR 1's coexistence rule still applies.
- **DO NOT make Pi create child nodes directly.** Even if it would be
  easier. The whole point is that the canvas only shows nodes humans
  intentionally created. Pi proposes via the button; humans accept.
- **DO NOT add a new collab room type or modify CollabRoom server code.**
  Reuse the existing `page` roomType from PR 1.
- **DO NOT add a global registry of action handlers via singleton/window.**
  Use a composable + provide/inject so the registry is scoped to the
  slideover instance and can be mocked in tests.
- **DO NOT use `setTimeout` / `sleep` to wait for Yjs sync.** Use the
  composable's `synced` ref or a watcher. The PR 1 NodeBlockEditor is
  the reference pattern.
- **DO NOT use `git add .` or `git add -A`** — stage specific files.
- After the change, run `pnpm typecheck` from the thinkgraph app
  directory. The app's typecheck environment is broken (auto-imports
  don't resolve cleanly under vue-tsc) — verify your changes don't
  introduce *new* errors at *new* line numbers, vs. baseline.
- Use the `/commit` skill, scope `thinkgraph` (or
  `thinkgraph,thinkgraph-worker` if you split worker + browser commits).
  Single commit per side OR a single combined commit — your call based
  on whether you can land both atomically.

## Acceptance criteria

1. From a Pi skill running in the worker, calling `pi.appendBlock(nodeId, ...)`
   results in a new block appearing in any open browser editor for that
   node within ~200ms (Yjs round-trip), without any page reload.
2. Calling `pi.appendActionButton(nodeId, { label: 'Create child', icon: 'i-lucide-plus', kind: 'create-child', payload: { title: 'X', template: 'compose' } })`
   renders an inert button inside the editor.
3. Clicking the button calls the `create-child` handler, which POSTs
   to the existing thinkgraph-nodes endpoint with `parentId = nodeId`,
   creates a new node, and updates the button's `consumed` attr to true.
4. After clicking, the button shows a "✓ Created — open" state with a
   link to the new child node. Clicking it twice does nothing (handler
   no-ops when `consumed`).
5. Reload the page. The button is still there, still in its `consumed`
   state. (Proves Yjs round-trip + row mirror persistence both work.)
6. Open the same node in a second browser tab while Pi is mid-run.
   New blocks appear in real-time in both tabs as Pi appends them
   (proves the per-node room is bidirectional).
7. Existing dispatch flow still works: `node.output` still gets written,
   the agent activity feed still streams, the chat panel still works,
   `Send to Pi` still triggers the existing pipeline.
8. `pnpm typecheck` shows no new errors at new line numbers vs. baseline.
9. Commit follows the project's commit conventions (use `/commit` skill).

## Out of scope (do not do)

- **CommentBlock, FileDiffBlock, TerminalBlock.** PR 3, 4, later.
- **Migrating the existing `output` field into the editor as a
  RichTextBlock.** Coexist for now. PR 5 polish.
- **Removing the chat panel or `chatconversations` collection.** Cleanup
  pass after PR 3 lands.
- **More action kinds beyond `create-child`.** The registry is built to
  be extensible, but only `create-child` ships in this PR. Adding more
  kinds is trivial after the architecture is proven.
- **A "consume undo" or "unconsume" affordance.** Buttons are one-shot.
  If Pi needs to re-propose, it can append a new button.
- **Streaming Pi prose into a single appended paragraph as it generates
  (token-by-token).** That's PR 5 polish — for PR 2, Pi appends
  whole-paragraph blocks at the end of its run or at meaningful checkpoints.
- **Schema enforcement for action `kind` values.** PR 2 ships exactly
  one kind (`create-child`). The handler registry is the source of truth.
  Unknown kinds gracefully no-op with a console warning.
- **Editing or deleting buttons via the slash menu / property panel.**
  Buttons are write-only from Pi's side. Humans interact via click.
  (Could add edit/delete affordances later if needed.)

## Done means

A Pi skill running in the worker can append blocks (prose + action
buttons) into any node's editor in real-time. Humans see Pi's work
streaming in. Clicking an action button creates a child node via the
existing API. State survives reload, syncs across tabs, and doesn't
disturb the existing dispatch pipeline. Old skills that don't use
`appendBlock` keep working.

Code word: report back when done.
