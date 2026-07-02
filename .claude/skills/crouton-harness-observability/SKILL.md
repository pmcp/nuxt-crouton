---
name: crouton-harness-observability
layer: stack
description: How to MEASURE this repo instead of eyeballing it — interpret the loop-station context-budget trend (history.jsonl, thresholds, the tokenizer-switch gotcha), read a session trace, use the eval ledger (cost-per-success), and pick the right evidence tool (app-shots, smoke-deployed, db-counts, --check modes). Use when asked "is the harness bloating", "how big is CLAUDE.md really", "did this agent run actually succeed", "prove this works", "what evidence do we have", or when tempted to declare a capability (browser, tool) unavailable. For RUNNING the loop-station scripts, defer to the loop-station skill — this skill is interpretation + the wider evidence toolkit.
---

# crouton-harness-observability

One line: the repo's proof toolkit — where the measurements live, how to read them without fooling yourself, and which gaps still force eyeballing.

"The harness" = this repo's agent-operating layer: root `CLAUDE.md` + `AGENTS.md` + `.claude/skills/**` + `.claude/agents/**` + the LLM CI workflows. It is treated as a system worth measuring (AGENTS.md "Observe the harness").

## When to use / when NOT to use

| You want to… | Use |
|---|---|
| Interpret a loop-station record, the budget trend, a session trace, the eval ledger; pick an evidence tool; know what is NOT instrumented | **this skill** |
| Run the loop-station scripts (gather/append/parse/advisor mechanics, CI wiring) | **loop-station** skill (it owns the runbooks; this skill never restates them) |
| Boot/observe an app locally or on staging, screenshots, DB inspection runbook | **crouton-run-and-operate** |
| Run tests + the honest coverage picture | **crouton-validation-reality** |
| Understand which workflow produced a CI artifact | **crouton-ci-and-deploy-map** |
| Know which config file a measurement reads | **crouton-config-registry** |

## 1. The loop-station inventory (WS1) — reading it

**Data:** `writeups/loop-station/history.jsonl` — committed on purpose (tiny, `git blame`-able; see its README). One JSON record per merge that touches the harness, appended by CI (`.github/workflows/loop-station-inventory.yml`). The WS2 runtime *trace* is the only loop-station dataset that is gitignored.

**Record shape** (fields verified against the file and `writeups/loop-station/README.md`, 2026-07-02):

| Field | Meaning |
|---|---|
| `generatedAt` / `commit` / `pr` | when + the merge/PR that caused the point |
| `tokenizer` | `anthropic` (API `count_tokens`) or `heuristic` (offline fallback) — **the ruler** |
| `totals.alwaysOnTokens` | root `CLAUDE.md` token weight — the always-on budget every session and every LLM CI cold-start pays |
| `totals.tokens` / `byKind` / `byLayer` | full corpus, split by claudemd/skill/agent and by `layer:` tag (method/stage/stack/unlayered) |
| `scorecard` | green/amber/red per dimension + `overall` (worst band wins) — formulas, not LLM judgments |
| `redundancy` | 8-word-shingle corpus redundancy % + top restated file pairs |
| `coldWrites` | per-LLM-CI-workflow tokens written per cold run (always-on + its `prompt:` block) |
| `artifacts` | per-file tokens/bytes/lines |

**Thresholds** (source of truth: `.claude/skills/loop-station/lib/scorecard.mjs` `THRESHOLDS`, verified 2026-07-02 — tune only there):

| Dimension | Amber | Red |
|---|---|---|
| `alwaysOn` (root CLAUDE.md tokens) | 12,000 | 18,000 |
| single `artifact` (any skill/agent file) | 4,000 | 8,000 |
| `redundancy` (corpus %) | 12 | 25 |
| drift-risk pair containment | counts as a pair at ≥ 30% | band by pair count: amber ≥ 2, red ≥ 5 |

### The tokenizer discontinuity — the #1 misread

Every record carries `tokenizer`. **Never compare numbers across two tokenizers.** The heuristic overcounts vs Anthropic `count_tokens` by roughly 20–25% here. Two real traps in the committed history (verified by reading all 20 records, 2026-07-02):

- The apparent "drop" 2026-06-30 (18,951 → 15,227) is the heuristic→anthropic switch, **not a diet**. (The API tokenizer itself landed in PR #958, 2026-06-29 — verified `git log -S count_tokens`; the `pr:1013` record is merely the first point where CI actually ran with the `ANTHROPIC_API_KEY`, so the switch *shows up* there. PR #1013 is the pi-telemetry adapter and contains no tokenizer code.)
- The **last committed record** (PR #1062, 2026-07-01) reverts to `heuristic` (19,704 / red). That is CI-ran-without-`ANTHROPIC_API_KEY` noise, **not a regression** — the anthropic-era point right before it (PR #686, same day) reads 15,798 / amber.

The advisor (`advisor.mjs`, see loop-station skill) encodes this rule: deltas are compared only within the same tokenizer.

### Current reality (measured 2026-07-02)

I ran `node .claude/skills/loop-station/gather.mjs --pretty` today (no API key in this env → `heuristic` tokenizer, so compare against heuristic-era records only):

- `alwaysOnTokens` **19,704 (red)** — identical to the PR #1062 heuristic record, i.e. root CLAUDE.md unchanged since. On the anthropic ruler that same file last measured **15,798 (amber band for always-on, but red as a single artifact — any file > 8k is artifact-red)**, PR #686, 2026-07-01.
- Within the anthropic era the trend was **monotonically climbing** (15,227 → 15,798 over 2026-06-30 → 07-01). The budget sits at/near its own red line and grows.
- Corpus today: 250k heuristic tokens across 56 artifacts (up from 44 / ~168k at PR #1062) — the jump is this knowledge-handoff skill library itself being written. Expect the next committed anthropic record to show the same step; that step is deliberate, not drift.
- Redundancy 2.2% (green); 1 drift pair: `a11y` ↔ `frontend-review` SKILL.md at 44.6% containment (a known kept-in-sync pair).
- `coldWrites`: every LLM CI workflow pays the full always-on budget per cold start (~13 workflows measured today) — the concrete cost of CLAUDE.md growth.

## 2. The session trace (WS2) — reading it at a glance

Producer mechanics live in the loop-station skill (`parse-transcripts.mjs`, `collect-traces.mjs`). What you get is `trace.jsonl` of events (shape verified against the script header, 2026-07-02):

```
{ ts, kind, name, parent, depth, agentId?, durMs? }
```

- `kind` = skill / agent / tool; `parent` + `depth` reconstruct the real call tree (2+-level agent recursion supported).
- **Privacy rule:** names + correlation ids + durations only — never tool inputs or results. Runtime exhaust → gitignored; CI ships it as an artifact tagged by `run_id` (the two-step collect→upload snippet lives in `claude.yml`).
- How to read one fast: sort by `ts`, indent by `depth`. Look for (a) the same skill/agent firing repeatedly at the same depth = a retry loop; (b) a long `durMs` on an agent with few children = it stalled, not worked; (c) tools firing with no skill parent = the model bypassed the skill it should have loaded.
- pi-harness runs (`pi-telemetry.mjs`, #944) emit the same event shape but at **agent granularity only** — no tool-level nesting until pi-otel spans are wired (open).

## 3. The eval ledger — did the run actually succeed, and at what cost?

**Data:** `writeups/reports/eval-ledger.jsonl` (committed, append-only; 3 records as of 2026-07-02). **Scripts:** `scripts/eval-ledger/{schema,append,scoreboard}.mjs` — usage in `scripts/eval-ledger/README.md` (all verified present, 2026-07-02):

```bash
node scripts/eval-ledger/scoreboard.mjs          # markdown rollup; --json / --html
node scripts/eval-ledger/append.mjs --flow a11y-reports --harness pi \
  --model anthropic/claude-haiku-4-5-20251001 --outcome report   # append one run; --check validates only
```

Semantics that matter when reading it:

- One record per agent run: `{ ts, flow, skill, harness, model, cost_usd, turns, wall_s, artifact_gate, ci, outcome, human, fix_rounds, ref, notes }`.
- **Success** = no gate failed AND `outcome ∈ {merged, report}`. **The routing metric is cost-per-success**, never raw cost or vibes. `model` is provider-qualified (`anthropic/…` vs `ollama/…`) because it's a cost board.
- **The gold negative:** the seed record is the 2026-06-22 pi/Haiku decompose spike that merged unreviewed to main with full creds and was **reverted in PR #862** (`outcome: "reverted"`, `human: "down"`). `outcome: reverted` is the strongest failure signal the ledger has; it birthed the reports-only-first rule (#867). Never delete or "clean up" that row.
- The ledger feeds `.claude/routing.json` (model routing, #864/#865) — routing changes should cite ledger evidence, the way the orchestrator/decomposer opus→sonnet demotion cited an N=4 A/B.
- Weekly scoreboard post: `.github/workflows/eval-scoreboard.yml`, cadence config-as-data in `.github/digests.yml` (see crouton-config-registry).

## 4. Evidence tools — pick by what you must prove

All scripts verified to exist and headers read, 2026-07-02. Full operating runbooks for the app-facing ones are in **crouton-run-and-operate**; this table is the "which proof do I reach for" index.

| To prove… | Tool (exact invocation) | Notes |
|---|---|---|
| "the UI renders like this" | `node scripts/app-shots.mjs <baseUrl> <path[:name]> […] [--out <dir>]` | Uses preinstalled chromium at `/opt/pw-browsers` (globs newest build — never hardcode a build number); output `screenshots/<name>.png` (HARD GATE location); exit 1 on any failure |
| "the DEPLOY actually works" (not just built) | `node scripts/smoke-deployed.mjs --url <url> --email <e> --password <pw> [--app <n>] [--manifest <app>/deploy.config.json]` | Login proof via `/api/auth/get-session` → optional CRUD round-trip from `deploy.config.json` `smoke.crud` → screenshot. Built because "typecheck + boot" twice masqueraded as done (#293, per its header). Report-only in CI unless `smoke.required: true` |
| "a generated app still boots/auths/CRUDs" | e2e fixture harness — see **crouton-validation-reality** and the **e2e-smoke** skill | Trace/video/screenshots land in `playwright-report/`; CI artifact `visual-qa-<fixture>` (14-day) |
| "types still hold" | `pnpm typecheck` (never `npx nuxt typecheck` from root) | Necessary, never sufficient — see AGENTS.md "Done is signed off, not asserted" (#988) |
| "what data is on a remote DB" (read-only) | `node scripts/db-counts.mjs --app <app> --env staging\|prod [--dry-run]` | SELECTs only; discovers db name from `wrangler.jsonc`; real run needs CF creds, `--dry-run` needs none |
| "which gates apply to this path" | `node scripts/harness-stages.mjs <path>` | e.g. `packages/crouton-core/x.ts` → `stage: package, gates(required): test-first` |
| "layer tags are honest" | `node scripts/harness-layers.mjs --check` | ⚠️ **Fails today** (skills `graduate` + `skills-digest` untagged) and — despite its own header — is wired into **no** CI workflow (verified `grep -r harness-layers .github/` → 0 hits, 2026-07-02). A red here may be pre-existing, not yours |
| "generated docs aren't stale" | `node scripts/gen-skills-doc.mjs --check` · `node scripts/gen-routing.mjs --check` · `node scripts/gen-package-catalog.mjs --check` | routing check passes today; skills-doc check flags any skill not registered in its `META` map (warning) and stale HTML (failure) — new skills trip it until registered + regenerated |
| "is a budget regression worth a ticket" | `node .claude/skills/loop-station/advisor.mjs --pretty` | Deterministic gate over history.jsonl; today it says `actionable: true` on the always-on red — see §1 for why the latest record's red is partly tokenizer noise |

## 5. Verify capabilities, don't assume (#629)

Root CLAUDE.md ("You HAVE a headless browser") is the standing rule; the incident behind it is [#629](https://github.com/FriendlyInternet/nuxt-crouton/issues/629) (verified: still open, 2026-07-02): an agent checked the default Playwright path (empty), saw `npx playwright install` fail (egress-blocked CDN), and declared "no browser" — while chromium sat preinstalled at `/opt/pw-browsers`. **Two partial negatives are not proof of absence.** Before declaring anything unavailable: env vars → non-default paths → filesystem search → system binaries. Same doctrine applies to TodoWrite (absent on some harnesses — fall back per root CLAUDE.md, don't retry-spam) and any "X isn't available here" claim inherited from a prior session: probe for 5 seconds first. `app-shots.mjs`'s `findChromium()` is the codified fix (env override: `PLAYWRIGHT_CHROMIUM_PATH`).

## 6. What has NO instrumentation (open gaps — verified 2026-07-02)

| Gap | Status |
|---|---|
| **Staging Worker logs**: only `apps/triage` and `apps/fanfare` have a `logs` script, and both tail the **production** worker (`npx wrangler tail <app>`). No staging tail script exists; hand-type `npx wrangler tail <app>-staging --env staging`. No log persistence (no Logpush/Sentry) — an untailed Worker error is gone forever | open |
| **Runtime product analytics**: `packages/crouton-analytics` exists (PostHog default, epic #945/#946) but **zero** apps/pocs/fixtures depend on it (grep over package.jsons, 2026-07-02). No uptime checks; deployed smoke runs only on deploys | open |
| **Visual regression**: screenshots exist, comparison is human — pixel-diff baselines explicitly deferred (`e2e/CLAUDE.md`) | open, deliberate |
| **`harness-layers --check` in CI**: documented as CI-enforced, actually unwired and currently failing (§4) | open drift |
| **pi WS2 tool-level nesting**: agent-granularity only until pi-otel spans are collected | open |
| **CI-agent tokenizer flakiness**: loop-station CI records silently fall back to `heuristic` when the key is missing (PR #1062 record) — a red in history may be a missing secret, not growth | known noise mode |

## Provenance and maintenance

Facts verified 2026-07-02 against: `writeups/loop-station/history.jsonl` (all 20 records read) + its README; a live `gather.mjs --pretty` and `advisor.mjs --pretty` run; `.claude/skills/loop-station/SKILL.md` + `lib/scorecard.mjs` + `parse-transcripts.mjs`; `scripts/eval-ledger/{README.md,append.mjs,scoreboard.mjs}` + `writeups/reports/eval-ledger.jsonl` (3 records read); headers of `scripts/{app-shots,smoke-deployed,db-counts}.mjs`; live runs of `harness-stages.mjs`, `harness-layers.mjs --check`, `gen-routing.mjs --check`, `gen-skills-doc.mjs --check`; GitHub issue #629 (read via API); grep for `crouton-analytics` consumers and for `"logs"` scripts in `apps/*/package.json`. Unverified-but-cited: issue numbers inside quoted script/skill prose (#293, #867, #883–#885, #926–#929, #944) — taken from the cited files themselves.

Re-verify when drifting:

```bash
node .claude/skills/loop-station/gather.mjs --pretty        # today's budget numbers (§1)
grep -o '"tokenizer":"[a-z]*"' writeups/loop-station/history.jsonl | tail -3   # ruler of recent records
sed -n '/THRESHOLDS/,/^}/p' .claude/skills/loop-station/lib/scorecard.mjs      # threshold bands
node scripts/eval-ledger/scoreboard.mjs                     # ledger state
node scripts/harness-layers.mjs --check; grep -rl harness-layers .github/ || echo "still unwired"
grep -rl crouton-analytics --include=package.json apps pocs fixtures || echo "still unconsumed"
```
