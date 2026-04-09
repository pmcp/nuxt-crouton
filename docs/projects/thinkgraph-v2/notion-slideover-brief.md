---
title: Notion-style block editor in node slideover
status: 🟢 PR 1, 2, 3 shipped — PR 4 pending dispatch
created: 2026-04-08
related:
  - brief.md (Step 1, Step 3)
  - thinkgraph-assistant-brief.md (Step 1 — Node conversations)
  - thinkgraph-convergence-brief.md (Phase 1A — MDC rendering)
  - notion-slideover-pr2-brief.md (PR 2 brief — shipped)
  - notion-slideover-pr4-brief.md (PR 4 brief — pending)
---

# Notion-style block editor in node slideover

A multi-PR series that turns the ThinkGraph project-page slideover into
a unified Notion-style document. Pi becomes a real collaborator
typing into the doc instead of writing opaque outputs to a flat
`output` field. Comments, action buttons, file diffs, and (eventually)
live terminals all become block types in the same editor — replacing
the current layered design (brief + output + chat + artifacts as
separate sections) with one coherent surface.

## Why

The current slideover layers multiple concepts on top of each other:
a brief textarea, a stage `output` text blob, a chat panel, an agent
activity log feed, an artifacts array, and a metadata accordion. Each
serves a different purpose but together they make the slideover feel
fragmented — the user has to mentally stitch pieces together to
understand what the node is and what's happening on it.

The Notion-style direction (validated against Linear, Figma, and
GitHub PR review patterns) is one editable doc, with rich block types
that absorb the existing concepts:

| Old surface | New form |
|---|---|
| `node.output` (flat text) | A `RichTextBlock` (or several) inside the doc |
| Chat panel (`chatconversations` collection) | Coexists in PR 1; later migrates to `CommentBlock` threads |
| Stage output artifacts | Auto-rendered as collapsible stage marker blocks |
| Next-step affordances | `ActionButtonBlock` inserted by Pi |
| Comments / reviews on the work | `CommentBlock` anchored to a doc selection |
| Live terminal output | `TerminalBlock` (deferred until PTY relay exists) |
| File diffs | `FileDiffBlock` (collapsible, syntax-highlighted) |

The user's hard rule: **only humans create child nodes**. Pi's
expression channels are write-prose, open-comment, and propose-button.
Action buttons are inert until a human clicks them. This keeps the
canvas clean (only intentional work shows up as cards) and gives Pi
unlimited room to reason in the doc without polluting the graph.

## Why it's cheap to build

`crouton-pages` already ships a Yjs-collaborative block editor at
`packages/crouton-pages/app/components/Editor/BlockEditor.vue`, with
~14 stock block types (RichText, Hero, Image, Gallery, CTA, Embed,
Collection, etc.) and an extension pattern that lets sibling
packages contribute new blocks without modifying the package.
`crouton-charts` is the proof point — it adds a Chart block via:

```
packages/crouton-charts/app/components/Blocks/
  ├─ ChartBlockRender.vue
  ├─ ChartBlockView.vue
  └─ ChartPresetPicker.vue
```

We're not building a TipTap editor from scratch. We're consuming
the existing one and adding new block types in later PRs.

## PR plan

| PR | Status | Scope |
|---|---|---|
| **PR 1** (this brief) | ✅ shipped | Embed `BlockEditor` in slideover, add `content` field to `thinkgraph_nodes`, no Pi writes, no new blocks |
| PR 2 | ✅ shipped | `ActionButtonBlock` + `pi.appendBlock` worker tool + `create-child` action handler |
| PR 3 | ✅ shipped | `commentAnchor` mark + `pi.openComment` / `pi.replyToComment` / `pi.resolveComment` tools + `CommentSlideout` panel + text-selection composer |
| PR 4 | 🟡 pending | `FileDiffBlock` (collapsible, syntax-highlighted) — see `notion-slideover-pr4-brief.md` |
| PR 5 | ⚪ planned | Polish + RichTextBlock streaming flow for Pi prose |
| (later) | ⚪ deferred | `TerminalBlock` — needs a PTY relay (currently no `TerminalRoom` DO exists in the codebase; check before scoping) |

### What landed in PR 3

PR 3 took a slightly different shape than the table line implies — comments
are an inline **mark**, not a block. The reason: comments anchor to spans of
text inside other blocks (a sentence inside a paragraph), so a block-level
`CommentBlock` would have been the wrong structural unit. The actual surface:

- **`commentAnchor` TipTap mark** — inline highlight on the anchored span
- **`Y.Map<CommentThread>` on the same page room** — single source of truth
  for thread records, observed by the browser to apply/remove marks
- **Worker tools `open_comment` / `reply_to_comment` / `resolve_comment`** —
  Pi creates threads via `comment-tools.ts`, mirroring the page-tools pattern
- **`useNodeComments` composable** — Y.Map observer, mark sync loop, and
  human action API (`openComment`, `replyToComment`, `resolveComment`,
  `openCommentOnSelection`)
- **`CommentSlideout.vue`** — collapsible threads panel beneath the editor
  (NOT a USlideover — the parent project page is already inside one, so
  stacking would overlap; an inline panel keeps doc + discussion in view
  together)
- **Text-selection composer** — header "Comment" button that captures the
  current editor selection, opens a UModal with the quoted text + a body
  field, and writes the thread on submit. Mark is applied first to avoid
  the cross-tab observer racing for the wrong occurrence on duplicate text

Schema for `CommentThread` is duplicated between worker (`yjs-page-client.ts`)
and browser (`useNodeComments.ts`) — there's no shared package between the
two. Comments in both files flag the duplication so future schema changes
update both sides.

Known v1 trade-offs documented in code comments:
- Inline-only selections (multi-block selections rejected — newlines in
  the quote can't be matched by the observer's text-node walk)
- The chat panel (`chatconversations`) still ships in parallel; migration
  into comment threads is a separate cleanup pass after PR 4 lands

Each PR is independently shippable. The slideover after PR 1 is
already better than today's even without the rest, because users get
a real rich-text surface instead of a `<UTextarea>`.

## Coexistence with existing surfaces

PR 1 is purely additive. Nothing existing changes:

- The brief textarea stays. The block editor lives BELOW it.
- The chat panel stays. Migration to comment-blocks lands in PR 3.
- The agent activity feed (`NodeAgentActivity.vue` from Step 3) stays
  in its current location. It does not go inside the block editor.
- The dispatch pipeline keeps writing to `node.output`. Pi-side
  writes to the editor land in PR 2.
- The `/break-down` slash command stays as-is. It will be deprecated
  in a later cleanup pass once the action-button flow is proven.

## Open coordination notes

- **Yjs bridge + large blob mutations.** Step 3's bridge
  (`packages/crouton-flow/app/composables/useFlowSyncBridge.ts`)
  surfaces `node.ephemeral` cleanly across row refetches. The new
  `content` field belongs on `node.data` (not ephemeral) since it's
  durable, not transient. Verify the bridge handles large block-JSON
  mutations without ping-ponging the row-sync watcher.
- **MDC migration target.** Phase 1A (MDC rendering) in
  `thinkgraph-convergence-brief.md` is partial. The
  ActionButtonBlock / CommentBlock / TerminalBlock blocks
  will eventually want to be MDC custom components if MDC ships, but
  for v1 they're plain Vue components in the crouton-pages block
  registry. Don't block on MDC.
- **Step 1 chat coexistence.** The `chatconversations` collection
  stays as-is in PR 1. The chat panel UI continues to use it. PR 3
  introduces the comment-block surface as a parallel path; eventual
  migration of chat into comments is a separate cleanup task, not
  part of this series.

---

# PR 1 — Brief (dispatchable)

This is the brief to paste into a fresh `task` template node and
dispatch via Send to Pi. Nothing above this line is part of the
dispatched content — it's context for humans browsing the doc.

---

Replace the ThinkGraph project-page slideover content area with the
crouton-pages BlockEditor, backed by a new `content` blob field on
thinkgraph_nodes. This is PR 1 of a multi-PR series toward making the
slideover a Notion-style document with embedded action buttons,
comments, and (eventually) terminals — but PR 1 ships ONLY the editor
embed and storage. No new block types, no Pi-side writes, no comments.
Just "the slideover now contains a real block editor that the human
can type into."

## Background

ThinkGraph nodes currently have a flat `output` text field on
`thinkgraph_nodes` (set by the dispatch pipeline) and a freeform chat
panel in the slideover. There's no rich-document surface. The next
several PRs will make the slideover a unified document where Pi
writes prose, posts action buttons, anchors comments, and (later)
embeds live terminals — replacing the layered design of brief +
output + chat + artifacts with one coherent doc.

The crouton-pages package already ships a Yjs-collaborative
block-based TipTap editor (`packages/crouton-pages/app/components/
Editor/BlockEditor.vue`), with an extension pattern that lets sibling
packages contribute new block types. crouton-charts is the proof
point — it adds a Chart block via `packages/crouton-charts/app/
components/Blocks/{ChartBlockRender,ChartBlockView,ChartPresetPicker}.vue`
without modifying crouton-pages.

This PR consumes that editor as-is. No new block types, no editor
modifications. Just embed it in the slideover, wire it to a new
content field on the node, and let humans type into it.

## Goal

After this PR ships, opening any node's slideover in the ThinkGraph
project page shows the existing brief field, and BELOW the brief
there is a full block editor where the human can write rich content.
Content persists to a new `content` field on thinkgraph_nodes. Empty
nodes show an empty editor with the standard block-add affordance.
Existing nodes (which have no content yet) also show an empty editor.
The existing `output` field stays untouched and continues to render
in its current location below the editor — coexistence, no migration.

## Files you'll touch

- `apps/thinkgraph/layers/thinkgraph/collections/nodes/server/database/schema.ts`
  Add a `content: text('content', { mode: 'json' })` column. Default
  null. Run the project's migration generation command (check the
  root CLAUDE.md for the right one — likely `npx nuxt db generate`).

- `apps/thinkgraph/layers/thinkgraph/collections/nodes/types.ts`
  Add `content: unknown | null` to the ThinkgraphNode type.

- `apps/thinkgraph/server/api/teams/[id]/thinkgraph-nodes/[id].patch.ts`
  (and any sibling endpoint that updates nodes — grep for
  `updateThinkgraphNode`) — accept `content` in the patch payload.

- `apps/thinkgraph/app/pages/admin/[team]/project/[projectId].vue`
  In the slideover dialog, embed the crouton-pages BlockEditor below
  the existing brief textarea, above the existing chat panel. Pass
  the node id, the current `selectedItem.content`, and an
  `@update:content` handler that calls the existing node-update path.

## Files to read but not modify

- `packages/crouton-pages/app/components/Editor/BlockEditor.vue` —
  prop API, emit signature, how it handles its own Yjs sync room,
  what context it expects (team, page id, etc). You may need to
  provide stub values for any props that assume a "page" context that
  doesn't apply to a node.
- `packages/crouton-charts/app/components/Blocks/ChartBlockView.vue` —
  reference for how external packages contribute blocks. You DO NOT
  need to do this in PR 1 — just understand the pattern so you don't
  paint into a corner.
- `packages/crouton-pages/CLAUDE.md` — package documentation.
- `apps/thinkgraph/app/components/NodeAgentActivity.vue` — exists
  alongside the brief. Your editor goes between the brief and the
  chat panel; do not collide with the agent activity feed's
  position.

## Hard constraints

- **DO NOT modify any file under `packages/`.** The
  `.claude/.package-edit-approved` gate is enforced. If you discover
  that BlockEditor.vue has hardcoded props that absolutely require a
  packages/ edit to use it outside of crouton-pages (e.g., it
  requires a `pageType` prop with a fixed enum), STOP and report what
  you found. Do not work around it. Do not unlock the gate. The user
  will decide whether to refactor the package or take a different
  approach.
- **DO NOT touch the existing `output` field, the existing chat panel,
  the agent activity feed, or any of the dispatch / pipeline /
  artifacts code.** They keep working exactly as today. The block
  editor is purely additive.
- **DO NOT add Yjs sync rooms manually.** BlockEditor.vue already
  handles its own collaboration via crouton-collab. Just pass it the
  right room id (probably the node id, scoped by team).
- **DO NOT add new block types in this PR.** ActionButtonBlock,
  CommentBlock, TerminalBlock all land in later PRs. PR 1 is "embed
  the editor as-is, let it render the existing block types from the
  crouton-pages block registry."
- **DO NOT add `setTimeout` / `sleep` to fix race conditions.**
- **DO NOT use `git add .` or `git add -A`** — stage specific files.
- After the change, run `pnpm typecheck` from the thinkgraph app
  directory. Fix any new errors before committing. Pre-existing
  errors in unrelated packages (crouton-triage, crouton module, etc.)
  are NOT yours to fix.
- Use the `/commit` skill, scope `thinkgraph`, type `feat`. Single
  commit. Commit message explains why, not just what.

## Acceptance criteria

1. The `thinkgraph_nodes` table has a new `content` column. The
   migration file is checked in.
2. Opening a node's slideover shows the existing brief, then a new
   block editor pane below it, then the existing chat panel and
   metadata sections.
3. Typing in the editor and switching to a different node, then
   switching back, shows the typed content was saved to the DB.
4. Two browser tabs viewing the same node see each other's edits in
   real time (proves the Yjs collaboration is hooked up via the
   shared room).
5. Existing functionality is unchanged: the brief field still works,
   the chat panel still works, dispatch / Send to Pi still works, the
   pipeline still runs, the agent activity feed still renders in its
   current position.
6. `pnpm typecheck` is clean (or only shows pre-existing unrelated
   errors in `crouton-triage`, `crouton` module, etc).
7. Single commit, scope `thinkgraph`, message follows the project's
   commit conventions.

## Out of scope (do not do)

- **Pi-side writes to the editor.** Pi keeps writing to `output` for
  now. PR 2 will add a `pi.appendBlock` tool — not your concern here.
- **Migrating existing `output` content** into the new editor.
  Coexist.
- **New block types** (ActionButton, Comment, Terminal, FileDiff) —
  those are PR 2-5.
- **Comments on selections, anchored threads, resolve/dismiss UI.**
- **Touching `/break-down`, the chat panel, the artifacts array,**
  or any dispatch endpoint.
- **A separate "node doc" route or page.** The editor lives ONLY
  inside the existing slideover for now.
- **Visual polish beyond what BlockEditor.vue provides out of the
  box.**
- **Migrating `chatconversations` into the new editor.** That's a
  separate cleanup pass after PR 3 lands.

## Done means

You can open a project, click any node, see a real block editor
inside the slideover, type into it, and the content persists across
reloads and across tabs. The migration is in. The typecheck is green.
The commit is single and explains why. The brief field, chat panel,
dispatch path, and agent activity feed all still work exactly as
they did before.

Code word: report back when done.
