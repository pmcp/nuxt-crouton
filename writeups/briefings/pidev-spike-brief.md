# pi.dev in-job agent — spike runbook + parity matrix

Internal brief for epic **#669** (pi.dev as the in-job agent; GitHub stays the
orchestrator) and spike **#670** (WS1). Not agent instructions — context only.

## The model (per #287 / #669)

GitHub keeps orchestration (issues = state, Actions = runner, decompose/resume/
wave workflows = fan-out). We swap **only the agent inside the job**:
`anthropics/claude-code-action` → `pi`, pointed at a cheaper/local model. The
cost win is the **model**, not the harness; quality is the binding constraint.

## How to run the spike (WS1)

Two paths, cheapest first. Both want a **throwaway test issue** (give it a real
description + acceptance criteria, else the artifact-gate correctly fails it for
being underspecified).

**A · Local, no runner needed (the afternoon "is it worth it?" test):**
```bash
# on the Mac mini (egress unrestricted there)
npx @robzolkos/lazypi                       # installs pi + skills + MCP + subagents
ANTHROPIC_API_KEY=sk-... ./scripts/spike-pidev.sh <throwaway-issue>
```
`scripts/spike-pidev.sh` prints `pi --help` first (confirm the real flags),
bridges `.claude/skills` → `.pi/skills`, runs pi in print mode on
`/task-decompose #NN`, and prints the three #670 success criteria to check.

**B · CI variant (needs the runner chain #653/#654/#657):** run the
`decompose-on-issue-pidev.yml` workflow (Actions → Run, dispatch-only). It is a
verbatim copy of `decompose-on-issue.yml` with only the agent step swapped and
the artifact-gate kept. Secrets: `PI_PROVIDER_KEY`, `HARNESS_PUSH_TOKEN`.

**Capture (feeds WS2/WS6):** model, run cost, wall time, and **every
claude-code-action feature pi lacked**.

## WS2 — feature-parity matrix (claude-code-action → pi.dev)

Every capability the live pipeline leans on, mapped to a pi equivalent. Legend:
✅ direct · ⚠️ needs wiring/verify · ❌ real gap.

| # | claude-code-action capability | Used by | pi.dev equivalent | Status | WS |
|---|---|---|---|---|---|
| 1 | `anthropic_api_key` (provider auth) | every run | provider key env (`pi-ai`, any provider/local) | ✅ | 4/6 |
| 2 | `prompt: "/task-decompose #NN"` (invoke skill) | decompose | `pi --print "/task-decompose #NN"` | ⚠️ verify flag | 1 |
| 3 | skill autoload from `.claude/skills` + `CLAUDE.md` | all | Agent Skills standard; bridge `.claude/skills`→`.pi/skills` | ⚠️ verify pi reads CLAUDE.md as system ctx | 5 |
| 4 | **subagent pipeline** (orchestrator→decomposer→worker via Agent tool) | decompose | `pi-subagents` (91k·2314★) / `@quintinshaw/pi-dynamic-workflows` + re-express `.claude/agents/*` personas | ⚠️ **highest-risk parity item** | 5/6 |
| 5 | MCP wiring (`crouton-mcp`) | generate | `pi-mcp-adapter` (99k·928★) | ✅ package exists | 5 |
| 6 | `claude_args: "--max-turns 30"` (turn cap) | decompose | pi turn/step-cap flag | ⚠️ verify flag name | 2 |
| 7 | `show_full_output: true` (full log) | debugging | print-mode stdout / RPC mode | ✅ format differs | 3 |
| 8 | `outputs.execution_file` (structured JSON log) | #661 artifact-gate "why" classifier | none (raw log only) | ⚠️ gate PASS/FAIL still works; only "why" degrades | 3 |
| 9 | `outputs.conclusion` | artifact-gate | derive from exit code | ✅ done in variant | 1 |
| 10 | `allowed_bots` (bot-actor guard) | decompose | none | ❌ re-express as workflow `if:` actor check / guard step | 4 |
| 11 | `id-token: write` (OIDC) | claude auth | not used (provider key) | ✅ drop it | 4 |
| 12 | git auth + **Harness App-token push** (pushes re-trigger CI) | worker→PR | `gh`/git auth + PAT/App token (`GITHUB_TOKEN` pushes don't cascade — #572/#626) | ⚠️ must wire | 4 |
| 13 | hooks (`settings.json` PreToolUse: packages-boundary, comment-provenance) | safety gates | pi extensions (before-turn / tool-call interception) | ❌ don't port; re-express | — |

### Reading of the matrix
- **No blocker in the orchestration layer** — GitHub stays as-is, so the thing I
  earlier mis-called "the killer" (CI automation) isn't replaced at all.
- **The artifact-gate already works for pi unchanged** (rows 8–9): its PASS/FAIL
  is `GITHUB_TOKEN`-based and harness-agnostic; only the actionable *why* message
  needs the WS3 adapter.
- **The two real risks are rows 4 and 12:** (a) reproducing the
  orchestrator→decomposer→worker **subagent** pipeline on `pi-subagents`/
  `dynamic-workflows` with the personas re-expressed, and (b) the **push path**
  that re-triggers downstream CI. Everything else is ✅/verify.
- **Above all (#669's own flag): model quality.** Decompose → scaffold → typecheck
  → fix → PR is frontier-hard; the cost win only counts if a cheap/local model
  holds quality. Measure on a real `/delegate` (WS6) before committing.

## Suggested order
WS1 (this spike) → WS2 (this matrix, refined by what the spike finds) →
WS4 (auth + push + bot guard) + WS3 (exec-log adapter) → WS5 (MCP + skills +
subagents) → WS6 (model routing + cost/quality measure) → WS7 (`AGENT_HARNESS`
toggle, default `claude-code-action`).
