# Agent prompt — Excalidraw diagrams connected to GitHub tickets (iterative)

> Copy everything below the line and hand it to another agent. It is self-contained.
> Repo context: `pmcp/nuxt-crouton`, GitHub access via the GitHub MCP tools
> (`mcp__github__*`). Related epic: #479 (make tickets human-readable).

---

## Your task

Build (and then operate) a way to attach an **Excalidraw diagram** of a GitHub epic's
structure to the epic, and **iterate on it with the human** until they're happy — then
keep it current as the epic evolves.

Excalidraw is chosen on purpose: the `.excalidraw` scene is **human-editable**, so the
person can drag the bot's diagram around, annotate it, and hand it back — a real
back-and-forth, not a take-it-or-leave-it image. (Mermaid was rejected: it does **not**
render in the GitHub mobile app — it shows raw code + a perpetual "Loading" spinner — and
isn't hand-editable.)

## Inputs (read these from GitHub — they ARE the diagram)

For a given epic issue `#NN`:
1. `issue_read` the epic and `get_sub_issues` → the node set (each child = a box).
2. For each child: its **title**, **state** (open/closed), labels (`status:*`), and any
   `Blocked-by: #x, #y` line in the body → the **edges** (dependency arrows).
3. Derive a **status** per node: closed → `done`; `status:in-progress` → `in_progress`;
   `status:blocked` → `blocked`; else `pending`. Add a final **goal** node if the epic's
   acceptance is a concrete artifact (e.g. a preview URL).

## Outputs

1. **`writeups/diagrams/<epic-slug>.excalidraw`** — the **editable source of truth**.
   Boxes coloured by status; arrows **bound** to boxes (so dragging a box keeps the graph
   connected). **Built** — the generator is `scripts/ticket-excalidraw.mjs` (pure emitters in
   `scripts/lib/excalidraw.mjs`): feed it the GitHub-read graph JSON (see Inputs) and it lays
   out the DAG and emits the scene. Drive it via the **`ticket-diagram` skill** — don't
   hand-author the JSON.
2. **`writeups/diagrams/<epic-slug>.png`** — a static export of that scene, for embedding in
   the issue/PR body (this is what renders on **mobile**; the `.excalidraw` does not embed).
   **Built** — rendered **offline** the same way `schema-review` / `ui-proposal` do, via the
   shared headless-Chromium renderer (`.claude/skills/ui-proposal/render.mjs`); the generator
   shells out to it automatically. The generator also writes `<epic-slug>.graph.json` (the
   auditable input). The round-trip back to excalidraw.com is via the **committed
   `.excalidraw`** (the human edits that file and commits it), not via scene-in-PNG metadata —
   so the PNG stays a plain, reliable, dependency-free raster.

## Where it lands + the iteration loop (reuse the sign-off loop, epic #310)

- Open (or reuse) a PR on the epic branch; **commit both files**. Post the PNG as a single
  **sticky comment** marked `<!-- ticket-diagram:<epic-slug> -->`.
- The human reviews **on the diff**: they either (a) inline-comment the committed
  `.excalidraw`/PNG, or (b) **edit the `.excalidraw` themselves** (in excalidraw.com) and
  commit/attach the new version. Both are "change requests."
- On a change request: re-read the (possibly human-edited) `.excalidraw`, regenerate the
  PNG, **edit the sticky comment in place** (append `- rN: <what changed>`), push. The hold
  stays.
- **Approval** = a comment containing `approve`/`lgtm`, a 👍 on the sticky comment, or an
  `approved` label. On approval, mark the PR ready / merge per the epic flow.
- **Ignore bot/self comments** (`user.type === 'Bot'`) to avoid loops.

## Keep it current

When the epic's children change (new sub-issue, a child closes, a `Blocked-by` edge
changes), regenerate the scene + PNG and refresh the sticky comment — the diagram is a
**live view** of the epic, not a one-shot.

## Constraints

- The **`.excalidraw` JSON is the editable source**; the **PNG is the render** for bodies.
  Never rely on a client-rendered diagram (Mermaid/widget) in a GitHub body — it must be a
  committed/attached **image** so it shows on mobile with no "Loading".
- Excalidraw is **MIT** — no watermark/branding constraints (unlike tldraw).
- Don't hand-author `.excalidraw` JSON by hand in the loop — always go through the
  generator script so output stays valid and repeatable.
- Follow repo rules: ISSUE-FIRST, commit via `/commit` referencing `(#NN)`, PRs target the
  epic branch, never push to `main`, never touch `packages/` without approval.

## Acceptance

- Opening the epic on the **GitHub mobile app** shows a legible status diagram (PNG) at a
  glance — no stuck "Loading".
- The human can edit the `.excalidraw`, hand it back, and the bot re-renders from their
  edit — a visible round-trip on the PR.
- The diagram regenerates correctly when the epic's sub-issue tree changes.
