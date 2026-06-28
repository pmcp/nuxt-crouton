---
name: loop-station
description: Measure the harness's own context budget — tokens per CLAUDE.md / skill / agent, lexical redundancy, per-CI cold-write totals — as a deterministic, trendable inventory (no LLM). Appends one point to a committed history.jsonl per relevant merge. Use when asked for "context budget", "how big is CLAUDE.md / our skills", "is the harness bloating", "loop station inventory", or to run the inventory by hand.
---

# Loop Station — context-budget inventory (WS1)

The first, cheapest layer of the **Loop Station observatory** (epic #926): a
**deterministic** snapshot of how big our always-on harness context is and how
much of it is restated, captured at every merge that touches it. No LLM in this
path — `count_tokens` is free tokenization, not generation — so the trend is
clean and reproducible.

> Boundary: this is the **producer**. The daily one-line readout is WS4
> (housekeeping digest reads the latest record); the rendered view is WS3
> (`pocs/loop-station`); the runtime invocation trace is WS2. Compute stays
> here in the scripts — the view only renders.

## What it measures

Walking root `CLAUDE.md` + every skill (`.claude/skills/**`) + every agent
(`.claude/agents/**`) + each LLM CI workflow's `prompt:` block:

- **tokens per artifact** — via Anthropic `count_tokens` when `ANTHROPIC_API_KEY`
  is set (free, deterministic), else a deterministic lexical heuristic. The
  record carries `tokenizer` so a trend is never silently compared across rulers.
- **lexical redundancy** — shingle-containment (8-word shingles). Corpus % of
  duplicated shingle occurrences (intra- *and* cross-file restatement), each
  file's self-redundancy, and the top restated artifact pairs (e.g. the
  near-duplicate `a11y` / `frontend-review` skills). Lexical, deterministic,
  trendable — escalate to embeddings only if real paraphrase slips through.
- **threshold scorecard** — `length` / `redundancy` / `drift-risk` graded
  green/amber/red by fixed **formulas** in `lib/scorecard.mjs` (not LLM
  judgments). Tune the bands in one place there.
- **cold-write totals** — for each CI workflow that runs `claude-code-action`,
  what it cold-writes per run (always-on `CLAUDE.md` + its own `prompt:` block).

## Files

| file | role |
|------|------|
| `gather.mjs` | walk + count + score → one JSON record on stdout (`--pretty` adds a summary on stderr) |
| `append-history.mjs` | append the record to `writeups/loop-station/history.jsonl`, idempotent per commit |
| `lib/tokens.mjs` | `count_tokens` with deterministic heuristic fallback |
| `lib/redundancy.mjs` | shingle-containment redundancy + self-redundancy |
| `lib/scorecard.mjs` | threshold bands (the one place to tune) |
| `writeups/loop-station/history.jsonl` | the **committed** trend data (see its README) |

## Run by hand

```bash
node .claude/skills/loop-station/gather.mjs --pretty                       # inspect
node .claude/skills/loop-station/gather.mjs | node .claude/skills/loop-station/append-history.mjs   # record a point
LOOP_STATION_FORCE_HEURISTIC=1 node .claude/skills/loop-station/gather.mjs  # force offline tokenizer (deterministic tests)
```

## In CI

`.github/workflows/loop-station-inventory.yml` runs on **merge to `main`**
path-filtered to `CLAUDE.md` / `.claude/skills/**` / `.claude/agents/**`. It
gathers (with `ANTHROPIC_API_KEY` → `count_tokens`), appends, and commits the new
`history.jsonl` line back with `[skip ci]` and the causing PR recorded — one data
point per relevant merge, with the cause attached, no filler.
