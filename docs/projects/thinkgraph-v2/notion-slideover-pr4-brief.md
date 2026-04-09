---
title: PR 4 — FileDiffBlock + pi.appendFileDiff
status: ✅ shipped
created: 2026-04-09
parent: notion-slideover-brief.md
related:
  - notion-slideover-brief.md (PR plan, PR 1/2/3 shipped)
  - notion-slideover-pr2-brief.md (ActionButton — pattern reference)
  - thinkgraph-assistant-brief.md (Step 1 — Node conversations)
---

# PR 4 — FileDiffBlock + pi.appendFileDiff

Fourth PR in the Notion-style slideover series. PRs 1–3 shipped a Yjs-backed
block editor where Pi can write prose, propose action buttons, and open
anchored comment threads. PR 4 adds the missing piece for code-related work:
**inline file diffs**. Pi appends a `fileDiff` block into the per-node editor;
the browser renders it as a collapsible panel with a file-path header,
+ / − line coloring, and (when available) syntax highlighting.

The user's hard rule from the parent brief is unchanged: **Pi proposes,
humans act**. A FileDiffBlock is read-only in v1 — Pi shows the proposed
change, the human reads it, and any "apply" affordance is explicit follow-up
work via an `actionButton` next to the diff (already supported by PR 2)
or a deferred PR 5 enhancement. The block itself never mutates the
filesystem.

## Why

After PR 3 the slideover is a real document — prose, anchored discussion,
inert action buttons. But code work is still second-class: Pi can describe
a change in prose, but it can't show the change. Users have to mentally
diff what Pi wrote against the current file, or scroll to a separate
artifact viewer. That breaks the "one coherent doc" goal.

PR 4 closes the gap. The flow becomes:

1. Human writes a brief or asks Pi for a change in the editor / chat
2. Pi runs its skill, generates a unified diff for the proposed change
3. Pi calls `pi.appendFileDiff(nodeId, { filePath, diff, language? })`
4. The browser editor in any open slideover for that node renders the
   diff inline, beneath whatever prose Pi wrote about it
5. Human reads, optionally clicks an action button next to it (e.g.
   "Apply this diff" — handled by PR 2's `actionButton` + a new
   `apply-file-diff` action handler that ships separately or in PR 5)

The block is intentionally read-only and stateless beyond its attributes.
It's a "look at what I'm proposing" surface, not an editor.

## What changes

| Surface | New |
|---|---|
| `apps/thinkgraph-worker/src/yjs-page-client.ts` | Add `appendFileDiff(opts)` method on `YjsPageClient` — appends a `fileDiff` Y.XmlElement to the content fragment, mirroring `appendActionButton` |
| `apps/thinkgraph-worker/src/file-diff-tools.ts` (NEW) | Pi tool `append_file_diff` mirroring the `page-tools.ts` pattern. Stateless; takes `filePath`, `diff`, optional `language`, optional `nodeId` |
| `apps/thinkgraph-worker/src/session-manager.ts` | Inject `createFileDiffTools` alongside `createPageTools` and `createCommentTools` |
| `apps/thinkgraph/app/extensions/file-diff.ts` (NEW) | TipTap leaf node extension. Schema: `filePath`, `language`, `diff`, `collapsed`. Atom (no inner content). Renders via `VueNodeViewRenderer(FileDiffBlock)` |
| `apps/thinkgraph/app/components/Blocks/FileDiffBlock.vue` (NEW) | NodeView component. Header (file path, language badge, collapse toggle); body parses the unified diff string and renders +/− lines with appropriate coloring |
| `apps/thinkgraph/app/components/NodeBlockEditor.vue` | Add `FileDiff` to the `editorExtensions` array. No other wiring needed |

## What does NOT change

- The existing `output` field, the chat panel, the agent activity feed,
  the artifacts array, the dispatch / pipeline / artifacts code. The
  coexistence rule from PRs 1–3 still applies.
- The schema. No new collections. No new columns on `thinkgraph_nodes`.
  The diff lives inside the existing `content` blob via the Y.XmlFragment.
- Existing skills. They opt in by calling `pi.appendFileDiff(...)` in
  their handlers — old skills that don't, keep working.
- The collab room types. Reuse the existing `page` room from PR 1.
- The action-button handler registry. PR 4 ships only the read-only
  diff surface; an "apply diff" action handler is out of scope.

---

# PR 4 brief (dispatchable)

Add a `fileDiff` block type, a `pi.appendFileDiff` worker capability, and
the worker-side tool wiring so Pi can show inline file diffs in the
per-node block editor. Read-only: humans see the proposed change, no apply
action ships in this PR.

## Background

After PR 3, the ThinkGraph project-page slideover has a real block editor
backed by a per-node Yjs room (`thinkgraph-node-${teamId}-${nodeId}`,
roomType `page`), with three Pi-writable surfaces: paragraph blocks,
action buttons, and comment threads. The dispatch pipeline still uses
`node.output` for opaque text — that surface is unchanged and untouched
by this PR.

This PR adds the fourth Pi-writable surface: file diffs. The block is
inert — it renders the diff Pi sent, that's it. No interactive lines,
no inline comments inside the diff, no apply button. The acceptance
criteria below are intentionally narrow.

Diff format: **standard unified diff text**. Pi generates the diff as a
plain string (whatever it produces from `git diff` or its internal diff
generator) and passes it to the tool. The browser parses the string
line-by-line on render. No diff library is bundled — the parsing is a
20-line `split('\n')` + first-character switch.

Syntax highlighting: **best-effort, optional**. If the host already
includes Shiki via `crouton-editor`, use it. If not, fall back to plain
monospace text with the +/− coloring still applied. The PR does NOT
add Shiki as a new dependency.

## Goal

After this PR ships:

1. A Pi skill running in the worker can call
   `pi.appendFileDiff(nodeId, { filePath, diff, language? })` and the
   block appears in any open browser editor for that node within ~200ms.
2. The block renders as a collapsible panel:
   - **Header**: file path (left, monospace), language badge or icon
     (right), collapse/expand chevron
   - **Body** (when expanded): the diff text rendered line-by-line with
     `+` lines on a green background, `-` lines on a red background,
     ` ` (context) lines neutral, and `@@` hunk headers in a muted style
3. Collapse state is per-block and persists across reloads (it's an
   attribute on the `fileDiff` element, not local component state).
4. Survives reload — the block is part of the Y.XmlFragment, mirrored
   to the row content blob via the existing PR 1 debounced PATCH.
5. Open the same node in a second browser tab — diffs Pi appends
   appear in real time in both tabs.
6. Existing dispatch flow still works: `node.output` still gets written,
   `agentLog` still streams, action buttons still click, comment
   threads still render.

## Files you'll touch

### Worker side

- `apps/thinkgraph-worker/src/yjs-page-client.ts`
  Add a `FileDiffInsert` interface and an `appendFileDiff(opts)` method
  on `YjsPageClient`. Mirror the existing `appendActionButton` pattern:
  build a `Y.XmlElement('fileDiff')`, set string attributes for
  `filePath`, `language`, `diff`, `collapsed`, append to `this.fragment`.
  Yjs attribute storage is string-only; encode `collapsed` as
  `'true'`/`'false'`, the diff string is passed verbatim.

- `apps/thinkgraph-worker/src/file-diff-tools.ts` (NEW)
  Mirror `page-tools.ts` and `comment-tools.ts`. Export `createFileDiffTools(pagePool, teamId, defaultNodeId)` returning a single tool:
  ```ts
  {
    name: 'append_file_diff',
    label: 'Append File Diff',
    description: 'Show a unified diff inline in a ThinkGraph node\'s editor. ...',
    parameters: Type.Object({
      filePath: Type.String({ description: 'Path of the file the diff applies to. Used as the panel header. Relative paths preferred.' }),
      diff: Type.String({ description: 'Unified diff text. Standard +/− line prefixes; @@ hunk headers supported. Newlines preserved verbatim.' }),
      language: Type.Optional(Type.String({ description: 'Language hint for syntax highlighting (e.g. "typescript", "vue"). If omitted, the browser auto-detects from the file extension. Use plain language slugs, not file extensions.' })),
      collapsed: Type.Optional(Type.Boolean({ description: 'Initial collapsed state. Default false. Set true for very large diffs to keep the editor scrollable.' })),
      nodeId: Type.Optional(Type.String({ description: 'Target node id. Defaults to the dispatched node.' })),
    }),
    execute: async (_id, params) => { ... acquire from pagePool, call appendFileDiff, return ok ... }
  }
  ```

- `apps/thinkgraph-worker/src/session-manager.ts`
  Import `createFileDiffTools`, instantiate alongside `createPageTools`
  and `createCommentTools`, spread into the final `tools` array.

### Browser side

- `apps/thinkgraph/app/extensions/file-diff.ts` (NEW)
  TipTap `Node.create({...})` extension. Pattern matches
  `extensions/action-button.ts`. Schema: leaf node, group `block`,
  atom, attributes:
  - `filePath: string` (`data-file-path` on the rendered element)
  - `language: string` (`data-language`, defaults to `''`)
  - `diff: string` (`data-diff`, the verbatim diff text — yes, attributes
    can hold large strings, Yjs handles it fine; do NOT base64-encode)
  - `collapsed: boolean` (`data-collapsed`, encoded `'true'`/`'false'`)
  Provide `insertFileDiff(attrs)` and `insertFileDiffDebug()` commands
  (the dev affordance lets you exercise the NodeView without running
  the worker). Render via `VueNodeViewRenderer(FileDiffBlock)`.

- `apps/thinkgraph/app/components/Blocks/FileDiffBlock.vue` (NEW)
  Vue NodeView. Two states:
  - **Collapsed**: header only — file path, language badge, expand
    button. Click expands.
  - **Expanded**: header + body. Body renders the diff:
    - Split on `\n`
    - For each line, switch on `line[0]`:
      - `' '` → context line, neutral background
      - `'+'` → addition, `bg-green-500/10` text default
      - `'-'` → removal, `bg-red-500/10` text default
      - `'@'` → hunk header, `bg-muted text-muted` italic
      - `'\\'` → "no newline at end of file" marker, `text-muted` italic
      - default → treat as context (defensive)
    - Lines render in a `<pre>` block with `font-mono text-xs leading-relaxed`
  - Use `commands.updateAttributes('fileDiff', { collapsed: ... })` to
    persist collapse state via the existing TipTap mutation path.
  - **No syntax highlighting in v1**. Mention in a TODO comment that
    the body could pipe through Shiki if `crouton-editor` exposes it,
    but do NOT add Shiki as a dep.
  - Match the visual style of `Blocks/ActionButtonBlock.vue` for the
    container border / header background.

- `apps/thinkgraph/app/components/NodeBlockEditor.vue`
  Add `FileDiff` to the `editorExtensions` array (alongside `ActionButton`
  and `CommentAnchor`). Add a dev-only slash menu entry
  `insertFileDiffDebug` to `suggestionItems` so you can exercise the
  NodeView without dispatching Pi. No other wiring needed — the slideout,
  composables, and DOM handlers from PR 3 are unaffected.

## Files to read but not modify

- `apps/thinkgraph-worker/src/yjs-page-client.ts` — see how
  `appendActionButton` builds Y.XmlElement attributes and appends to
  the fragment. Mirror that exactly.
- `apps/thinkgraph-worker/src/page-tools.ts` and `comment-tools.ts` —
  the tool-definition pattern (`createXxxTools(pagePool, teamId, nodeId)`,
  `textResult`, `pagePool.acquire`/`touch`, default-nodeId fallback).
  `file-diff-tools.ts` is the same shape with one tool instead of three.
- `apps/thinkgraph/app/extensions/action-button.ts` — the TipTap Node
  extension pattern with attribute parsing/rendering, JSON-encoded
  payload, and the NodeView wiring. `file-diff.ts` is structurally
  identical except all attributes are plain strings (no JSON envelope).
- `apps/thinkgraph/app/components/Blocks/ActionButtonBlock.vue` — the
  NodeView component pattern. `FileDiffBlock` is simpler (no provide/
  inject, no action handlers — just render attributes).
- `packages/crouton-editor` — confirm whether Shiki is exposed via the
  package's public API. If yes, you can OPTIONALLY use it for syntax
  highlighting. If no, ship plain monospace and document the limitation
  in a code comment. Do NOT modify the package either way.
- The `notion-slideover-pr2-brief.md` "Hard constraints" section. The
  same hard rules apply here.

## Hard constraints

- **DO NOT modify any file under `packages/`.** The
  `.claude/.package-edit-approved` gate is enforced. `FileDiffBlock`
  lives in the thinkgraph app, not in any package. If you discover that
  `CroutonEditorBlocks` rejects custom block extensions in some way that
  requires a packages/ edit, STOP and report.
- **DO NOT touch the existing `output` field, the dispatch pipeline,
  the chat panel, the agent activity feed, the artifacts code, or
  PR 3's comment composables.** Coexistence with everything that
  shipped in PRs 1–3 is mandatory.
- **DO NOT bundle a diff library** (jsdiff, diff2html, etc.). Pi sends
  pre-formatted unified diff text; the browser does line-by-line
  rendering with a `split('\n')` and a switch on the first character.
- **DO NOT bundle Shiki as a new dependency.** If `crouton-editor`
  already exposes a highlighter you can opportunistically use, that's
  fine — but the PR ships green even with plain monospace fallback.
- **DO NOT add an apply / accept / reject affordance on the diff.**
  Read-only. If users want to act on a proposed diff, Pi can append a
  separate `actionButton` block next to it via the PR 2 surface. The
  `apply-file-diff` action handler is a deferred follow-up.
- **DO NOT add a side-by-side diff view.** Unified only. Side-by-side
  is a polish item that requires significant layout work.
- **DO NOT make Pi auto-apply diffs to the filesystem.** This block
  is a display surface, not a write surface. Even if the underlying
  worker has filesystem access, do NOT call out to it from this block
  or its NodeView.
- **DO NOT use `setTimeout` / `sleep` to fix race conditions.** The
  Yjs round-trip is synchronous from the worker's POV — `appendFileDiff`
  followed by another append works without any delay between calls.
- **DO NOT use `git add .` or `git add -A`** — stage specific files.
- After the change, run `pnpm typecheck` from the thinkgraph app
  directory. The app's typecheck environment has known baseline noise
  (vue-tsc auto-imports for SFCs in NodeBlockEditor.vue) — verify your
  changes don't introduce *new* error TYPES at *new* line numbers vs.
  baseline. Pre-existing errors in `crouton-triage`, `crouton/src/module.ts`,
  etc. are NOT yours to fix.
- Use the `/commit` skill, scope `thinkgraph`. Single commit covering
  worker + browser sides (the round-trip needs both to land atomically,
  same as PRs 2 and 3 did).

## Acceptance criteria

1. From a Pi skill running in the worker, calling
   `pi.appendFileDiff(nodeId, { filePath: 'src/foo.ts', diff: '...' })`
   results in a new block appearing in any open browser editor for that
   node within ~200ms (Yjs round-trip), without any reload.
2. The block renders as a collapsible panel with the file path in the
   header. Default state is expanded.
3. Diff lines render correctly:
   - `+ added line` → green background
   - `- removed line` → red background
   - `  context line` → neutral
   - `@@ -1,3 +1,3 @@` → muted/italic hunk header
4. Clicking the collapse chevron in the header collapses the body to
   just the header. Clicking again expands. State persists across
   reload (stored in the `collapsed` attr, not local component state).
5. Reload the page. The block is still there in its previous collapsed
   state, with the same diff content. (Proves Yjs round-trip + row
   mirror persistence work for large string attributes.)
6. Open the same node in a second browser tab while Pi is mid-run.
   New diff blocks appear in real-time in both tabs as Pi appends them.
7. Existing dispatch flow still works: `node.output` still gets written,
   the agent activity feed still streams, the chat panel still works,
   action buttons (PR 2) and comment threads (PR 3) still render and
   function.
8. The dev-only slash menu entry `insertFileDiffDebug` exists and
   inserts a hard-coded sample diff so the NodeView can be exercised
   without running the worker.
9. `pnpm typecheck` shows no NEW error types at new line numbers vs.
   baseline. (vue-tsc auto-import noise on `NodeBlockEditor.vue` is
   pre-existing — adding instances of the same error type is acceptable
   and matches the file's existing pattern.)
10. Single commit, scope `thinkgraph`, type `feat`, follows project
    commit conventions.

## Out of scope (do not do)

- **Apply / reject affordances on the diff.** Read-only. A future PR
  (likely 4.5 or part of PR 5 polish) can add an "Apply this diff"
  `actionButton` next to file-diff blocks via the existing PR 2 surface.
- **Inline review comments inside diff lines.** Comments anchor to the
  prose around the diff, not to individual lines. Cross-block anchoring
  is explicitly out of scope for the comments composable (PR 3 v1).
- **Side-by-side diff view.** Unified only.
- **Token-streaming the diff line-by-line as Pi generates.** Pi appends
  whole diffs at the end of its run. Streaming is a PR 5 polish item.
- **Diff library** (jsdiff, diff2html). Pi sends pre-formatted unified
  diff text.
- **Bundling Shiki** as a new dependency for syntax highlighting.
  Best-effort via existing `crouton-editor` exports if available;
  plain monospace fallback otherwise.
- **An `apply-file-diff` action handler.** Deferred. The diff block
  is a display surface; the apply pathway is its own design problem
  (filesystem access from worker vs browser, idempotency, conflict
  detection, etc.).
- **Migrating existing artifacts** into FileDiffBlocks. Coexistence.
- **Auto-detecting language from file extension on the worker side.**
  The worker passes the language through verbatim; the browser
  auto-detects on render if the attribute is empty. Keeps the worker
  thin.
- **Editing the diff via slash menu / property panel.** Diffs are
  write-only from Pi's side. Humans interact via collapse/expand only.
- **Schema validation of the diff string** on the worker side. The
  browser is defensive — invalid diffs render as plain text with no
  coloring. Garbage in, garbage rendered.

## Done means

A Pi skill running in the worker can append a unified diff into any
node's editor in real-time. Humans see the diff inline, collapsible,
with +/− line coloring. State survives reload, syncs across tabs,
and doesn't disturb the existing dispatch pipeline, comment threads,
or action buttons. Old skills that don't call `appendFileDiff` keep
working.

Code word: report back when done.
