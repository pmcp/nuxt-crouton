---
name: loop-station
layer: method
description: Observe the harness itself — (WS1) measure context budget as a deterministic, trendable inventory (tokens per CLAUDE.md / skill / agent, lexical redundancy, per-CI cold-write totals; committed history.jsonl), and (WS2) reconstruct the real invocation trace (which skills/agents/tools fired and how they nested) from session transcripts. Use for "context budget", "how big is CLAUDE.md / our skills", "is the harness bloating", "how do our agent loops actually run", "trace this session", "loop station".
---

# Loop Station — harness observatory (WS1 inventory + WS2 trace)

> WS1 (context-budget inventory) is below; the WS2 invocation trace is the second
> section. Both are producers — WS3 (`pocs/loop-station`) renders them.

# WS1 — context-budget inventory

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

---

# WS2 — invocation trace

Reconstructs the **real call tree** of a session — which skills/agents/tools
fired, how they nested, how long sub-agents ran — from Claude Code transcripts.

> **Hard privacy rule:** the trace carries **names + correlation ids + durations
> only**, never a tool's `input` or a `tool_result`'s content. It is runtime
> exhaust → **gitignored**, shipped from CI as an artifact, never committed
> (unlike WS1's `history.jsonl`).

## What it reads

`~/.claude/projects/<slug>/<session>.jsonl` (+ its `subagents/agent-*.jsonl`).
Two transcript layouts are auto-detected — the parser handles both because
Claude Code has shipped both:

- **inline** (current local schema) — sub-agents are `isSidechain` records in the
  main transcript; skills tag their calls with `attributionSkill`. Nesting comes
  from the `parentUuid` tree + those markers.
- **files** (the proven prototype layout) — each sub-agent is its own
  `subagents/agent-*.jsonl`, linked to its spawning Agent call by global
  start-time order (robust for sync *and* async agents), carrying durations.

Both reconstruct **2+-level recursion** (agent→agent→…) to the correct depth.

## Files

| file | role |
|------|------|
| `parse-transcripts.mjs` | parse one session → `trace.jsonl` of `{ts,kind,name,parent,depth,agentId?,durMs?}` (also importable: `parseSession()`) |
| `collect-traces.mjs` | CI collector — discover the run's session across all project dirs, tag events with the run id, write one NDJSON file (meta header + tagged events) for artifact upload |
| `lib/parse-transcripts.test.mjs` | fixtures for both layouts, 2-level recursion, payload-freeness, defensiveness |

## Run by hand

```bash
node .claude/skills/loop-station/parse-transcripts.mjs --out trace.jsonl   # latest session
node .claude/skills/loop-station/parse-transcripts.mjs <session> --json     # inspect
node .claude/skills/loop-station/collect-traces.mjs --out loop-station-trace.jsonl
```

## In CI

`claude.yml` carries the reusable two-step snippet (collect → upload artifact),
`if: always()` and tolerant so it never fails the agent job. Copy those two steps
into any LLM workflow to capture its trace. Each ephemeral runner ships its
trace tagged by `run_id`; aggregating the artifacts gives the all-runs topology
WS3 renders.

---

# WS5 — advisor (state → actionable ticket)

Turns the observatory from numbers-to-look-at into decisions. An agent reviews the
inventory state and, **only when something's actionable**, files a single GitHub
issue assigned to the maintainer with concrete recommendations.

> Two layers, kept separate: deterministic **numbers → the WS4 digest** (no LLM);
> qualitative **remarks → a ticket** (this). The LLM never touches the trend and
> only *recommends* — epic #926's observatory-not-builder boundary holds.

## Files

| file | role |
|------|------|
| `advisor.mjs` | **deterministic gate** — reads `history.jsonl`, surfaces candidate findings (scorecard reds, sharp always-on growth, redundancy jumps), decides `actionable`. No LLM, no issue. Importable `analyze()`. |
| `lib/advisor.test.mjs` | findings logic (reds flag, growth flags, cross-tokenizer deltas are NOT compared, deterministic) |
| `.github/workflows/loop-station-advisor.yml` | weekly: run the gate → **only if actionable** invoke `claude-code-action` to open/update ONE `loop-station-advisor` issue assigned to `pmcp` |

## Why the gate is deterministic

The cheap deterministic pass decides *whether to bother the human* (and whether to
spend an LLM call) — so the model runs only on a real signal, never on a quiet
week, and the trend numbers stay LLM-free. Deltas are compared **only within the
same tokenizer** (a heuristic→anthropic switch isn't real growth).

## Run by hand

```bash
node .claude/skills/loop-station/advisor.mjs --pretty   # see findings + actionable verdict
```
