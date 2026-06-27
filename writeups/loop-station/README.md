# Loop Station — committed inventory data

This folder holds the **committed** output of the Loop Station context-budget
inventory (WS1 of epic #926, sub-issue #927).

## `history.jsonl`

One JSON record per relevant merge — appended by
`.claude/skills/loop-station/append-history.mjs`, produced by `gather.mjs`. It is
**committed on purpose**: the volume is tiny (~one short line per merge that
touches the harness), and keeping it in-repo means the metric travels with the
code it measures and stays `git blame`-able. The runtime *trace* (WS2) is the
only Loop Station dataset that is gitignored — not this.

Each record (see `gather.mjs` for the exact shape):

| field | meaning |
|-------|---------|
| `generatedAt` / `commit` / `pr` | when, and the merge/PR that caused the point |
| `tokenizer` | `anthropic` (count_tokens) or `heuristic` (offline fallback) — **don't compare a trend across two tokenizers** |
| `totals.alwaysOnTokens` | root `CLAUDE.md` token weight (the always-on budget) |
| `totals.tokens` / `byKind` | all measured artifacts, split by claudemd/skill/agent |
| `scorecard` | green/amber/red bands for length / redundancy / drift-risk (formulas, not LLM) |
| `redundancy` | corpus shingle redundancy %, per-file self-redundancy, top restated pairs |
| `coldWrites` | per-CI-workflow cold-write totals (always-on + prompt) for each LLM workflow |
| `artifacts` | per-file tokens / bytes / lines |

The **first line is a heuristic-tagged seed** (generated without an API key); the
first CI run on a relevant merge writes the first `anthropic`-tagged point.

## Regenerate by hand

```bash
# print a record (uses count_tokens if ANTHROPIC_API_KEY is set, else heuristic)
node .claude/skills/loop-station/gather.mjs --pretty

# append it to history.jsonl (idempotent per commit)
node .claude/skills/loop-station/gather.mjs | node .claude/skills/loop-station/append-history.mjs
```
