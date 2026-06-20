---
name: ticket-diagram
description: Attach an editable Excalidraw status diagram to a GitHub epic — read the epic + its sub-issue tree, render boxes-coloured-by-status with dependency arrows to a committed .excalidraw (editable source of truth) + a PNG that renders on the GitHub mobile app, post it as a sticky comment, and iterate with the human until approved. Use when asked to "diagram an epic", "draw the ticket tree", "show the epic on mobile", "add a status graph to #NN", or to keep an epic's diagram current as its children change.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Ticket diagram — an editable, mobile-legible status graph per epic

Turn a GitHub epic's sub-issue tree into a picture: **boxes coloured by status, dependency
arrows bound to the boxes**, committed as an **editable `.excalidraw`** (the source of truth a
human can rearrange and hand back) plus a pre-rendered **PNG** for the issue/PR body.

This is workstream #2 of the human-readable-tickets epic ([#479](https://github.com/pmcp/nuxt-crouton/issues/479))
made concrete, tracked under epic [#483](https://github.com/pmcp/nuxt-crouton/issues/483). It
reuses the **sign-off / revision loop** of #310 (the same loop `ui-proposal` and `schema-review`
use): generate → post on the PR → iterate on feedback → approve.

> **Why Excalidraw + a PNG?** Mermaid is **disqualified**: on the GitHub *mobile* app a
> ```` ```mermaid ```` block shows raw code + a perpetual "Loading" spinner (confirmed on #479).
> A committed PNG renders everywhere, including mobile, with no stall. Excalidraw is the *source*
> because the `.excalidraw` scene is **hand-editable** (MIT-licensed, no watermark) — drag a box
> and the bound arrows follow, so the human can iterate with the bot, not just accept an image.

## The pipeline (two halves)

```
  YOU (over the GitHub MCP)            the GENERATOR (deterministic, offline)
  ────────────────────────            ──────────────────────────────────────
  read epic + get_sub_issues   ──▶    scripts/ticket-excalidraw.mjs <graph.json>
  build the graph JSON                  → writeups/diagrams/<slug>.graph.json   (auditable input)
                                        → writeups/diagrams/<slug>.excalidraw   (editable source)
                                        → writeups/diagrams/<slug>.png          (body image, mobile-safe)
```

The split matters: **the agent does the GitHub I/O; the script does the graph→artifacts step**
(no network at render time, byte-stable output → minimal diffs). Never hand-author the
`.excalidraw` JSON — always go through the generator so output stays valid and repeatable.

## 1 · Read the epic → build the graph JSON

For epic `#NN`: `issue_read` (get) the epic, then `issue_read` (get_sub_issues). For each child
read its **title**, **state** (open/closed), **labels** (`status:*`), and any `Blocked-by: #x, #y`
line in the body. Then build:

```json
{
  "epic": 479,
  "slug": "make-tickets-human-readable",
  "title": "Make tickets human-readable",
  "nodes": [{ "id": 454, "title": "Schemas + config", "status": "done" }],
  "edges": [{ "from": 454, "to": 455 }],
  "goal": { "label": "library-catalog.pmcp.dev" }
}
```

- **status** per node — `closed → done` · label `status:in-progress → in_progress` ·
  `status:blocked → blocked` · otherwise `pending`.
- **edges** — `Blocked-by: #x` on child `C` ⇒ edge `{ "from": x, "to": C }` (the arrow points
  from the blocker to the dependent; the generator lays out blockers above dependents).
- **goal** (optional) — add it when the epic's acceptance is a concrete artifact (e.g. a preview
  URL). The generator wires every terminal node into it and colours it violet.
- **ref** (optional, per node) — a top-line label override (e.g. `"W2"`) for nodes that aren't
  real issues, like an epic's workstreams before it's decomposed. Defaults to `#<id>`.
- **feedbackUrl** (optional) — turns the diagram's footer into a clickable **"💬 Comment or send
  edits"** link (in the `.excalidraw` *and* the PNG), pointing at where the diagram is discussed —
  pass the **PR URL**. Defaults to the epic issue URL. Note an Excalidraw link can only *navigate*:
  it lands the human on the thread to comment; it can't capture edited geometry on its own — for
  that they paste an excalidraw Copy-link or attach the exported PNG there.
- **slug** — kebab-case; drives the output filenames. Reuse the same slug every regeneration so
  the diff stays small and the sticky comment keeps pointing at the same files.

## 2 · Generate

```bash
node scripts/ticket-excalidraw.mjs /tmp/<slug>.graph.json --out-dir writeups/diagrams
```

Writes the three artifacts (PNG via the **shared** renderer `.claude/skills/ui-proposal/render.mjs`,
headless Chromium — same pipeline as `schema-review`). `--no-png` skips the raster (prints the
manual render command). Then **commit** `<slug>.graph.json`, `<slug>.excalidraw`, and `<slug>.png`
with `/commit`, referencing `(#NN)`. (The `.html` render intermediate goes to the OS temp dir — it
is not committed.)

## 3 · Post the sticky comment & iterate (the #310 loop)

Post the PNG as a **single sticky comment** on the epic's PR, marked with an HTML anchor so you can
find and edit it in place:

```markdown
<!-- ticket-diagram:make-tickets-human-readable -->
### 🗺️ Epic diagram — Make tickets human-readable
![epic diagram](https://raw.githubusercontent.com/pmcp/nuxt-crouton/<branch>/writeups/diagrams/make-tickets-human-readable.png)

**Editable source:** [`make-tickets-human-readable.excalidraw`](…) — open at excalidraw.com, drag
boxes around (arrows follow), and commit it back; I'll re-render the PNG from your scene.

_Revisions:_
- r1: initial
```

Reference the PNG by its **raw.githubusercontent.com URL on the branch** so it renders on mobile
(a repo-relative path won't render in a comment). The human reviews **on the diff**:

- They **inline-comment** the committed `.excalidraw`/PNG, **or** they **edit the `.excalidraw`**
  themselves (in excalidraw.com) and commit it back. Both are change requests.
- **On a change request:** if they edited the scene, re-read the (now human-edited) `.excalidraw`
  and re-render the PNG from it; if they asked for a content change, update the graph JSON and
  regenerate. Either way **edit the sticky comment in place** (append `- rN: <what changed>`),
  push, and keep the hold.
- **Ignore bot/self comments** (`user.type === 'Bot'`) so you don't loop on your own sticky.

**Approval** = a comment containing `approve`/`lgtm`, a 👍 on the sticky comment, or an `approved`
label. On approval, mark the PR ready / merge per the epic flow.

## 4 · Keep it current (it's a live view, not a one-shot)

When the epic's children change — a new sub-issue, a child closes, a `Blocked-by` edge changes —
rebuild the graph JSON, regenerate, and refresh the sticky comment. Same slug ⇒ the `.excalidraw`
and PNG update in place and the diff shows exactly what moved.

## Status palette

| status | colour | meaning |
|---|---|---|
| `done` | 🟩 green | child issue closed |
| `in_progress` | 🟦 blue | `status:in-progress` label |
| `blocked` | 🟥 red | `status:blocked` label |
| `pending` | 🟨 yellow | open, not started |
| goal | 🟪 violet | the epic's concrete acceptance artifact |

## Files

- `scripts/ticket-excalidraw.mjs` — CLI: graph JSON → `.graph.json` + `.excalidraw` + `.png`.
- `scripts/lib/excalidraw.mjs` — pure emitters: `layout()` (layered DAG, blockers above
  dependents), `toExcalidraw()` (bound arrows + bound text), `toSvg()`/`toHtml()` (offline mirror
  for the PNG). No dependencies; the PNG step reuses the repo's headless-Chromium renderer.

## Gotchas

- **The `.excalidraw` is the editable source; the PNG is the render.** Never put a client-rendered
  diagram (Mermaid/widget) in a GitHub body — it must be a committed image so it shows on mobile.
- **Round-trip is via the committed `.excalidraw`**, not the PNG. The human edits the scene file
  and commits it; the PNG is regenerated from whatever scene is on the branch.
- **Reuse the slug** across regenerations, or you'll orphan the old files and the sticky image link.
- If the epic has **no sub-issues yet**, diagram its workstreams as `ref`-labelled nodes (e.g.
  `W1`…`W5`) — the diagram populates with real issues the moment the epic is decomposed.
