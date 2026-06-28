# Loop Station — the observatory view (WS3)

The read-only viewer for the Loop Station observatory (epic #926, sub-issue #931).
It **only renders** — all compute lives in the WS1/WS2 scripts under
`.claude/skills/loop-station/`. This app stages their output and draws it.

## What it shows

- **Context budget · CLAUDE.md** — always-on token trend per merge (`nuxt-charts` LineChart).
- **Scorecard** — length / redundancy / drift-risk bands as KO LEDs (green/amber/red).
- **Loop graph** — the observed call topology via `@vue-flow/core` + `@dagrejs/dagre`
  auto-layout (node ∝ invocations, ⟲ = recursion).
- **Inventory · size × usage** — dead-weight detector (big skill × zero invocations).
- **CI cold-write** — per-LLM-workflow always-on + prompt totals.
- **Trace** — depth-indented event timeline with sub-agent durations.

## Stack (ecosystem reuse, no crouton-core)

A standalone Nuxt app — **no DB, no auth, no crouton-core** (it's a static viewer):

- **`@fyit/crouton-themes/ko`** — the hardware (Teenage-Engineering) theme, so the
  observatory reads like a physical instrument (`KoPanel`, `KoLed`, `KoDisplay`).
- **`nuxt-charts`** — the charting module `crouton-charts` wraps; used directly
  here since there's no collection to bind to.
- **`@vue-flow/core` + `@dagrejs/dagre`** — the graph stack `crouton-flow` wraps;
  used directly because we render a fixed trace, not an editable multiplayer graph.

> We deliberately avoid the `crouton-flow` / `crouton-charts` *wrappers* — they
> extend `crouton-core` (collections, auth, collab) for *authoring* collection
> data. The observatory only *observes*, so it adopts the underlying libraries.

## Data seam

`scripts/prepare-data.mjs` runs before `dev`/`build` and stages into `public/data/`:

- `history.jsonl` ← the committed WS1 inventory (`writeups/loop-station/history.jsonl`).
- `trace.jsonl` ← WS2: reconstructed from local transcripts if present (real data),
  else the committed `data/example-trace.jsonl` (a real captured trace).

`public/data/` is gitignored (build artifact); the sources of truth are committed.

## Run

```bash
pnpm --filter loop-station dev        # http://localhost:3021
pnpm --filter loop-station build
pnpm --filter loop-station cf:staging # via /poc-deploy for a staging URL
```
