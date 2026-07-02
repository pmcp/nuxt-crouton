---
name: crouton-docs-trust-map
layer: stack
description: Which docs in nuxt-crouton to trust, which are verified stale, and how to resolve contradictions between them. Use when two docs disagree, when a doc's claim doesn't match the code ("the README says packages/nuxt-crouton but that dir doesn't exist"), when deciding whether a guide/writeup is authoritative before following it, or when asked "is this doc current", "which doc wins", "why does CLAUDE.md say X but the code says Y", "can I trust the deployment guide", "should I follow PROGRESS_TRACKER.md". Also the reference for the supersession-banner practice and where a new CLAUDE.md is warranted.
---

# crouton-docs-trust-map

One-line purpose: the map of which documents in this repo tell the truth, which provably lie (with the exact offending lines), and the trust order that resolves conflicts.

## When to use / when NOT to use

| Situation | Use |
|---|---|
| Two docs disagree; a doc contradicts code; "is this guide current?" | **This skill** |
| Mechanically updating docs after a code change (pre-commit) | `sync-docs` skill |
| Auditing a package's doc completeness / drift detection | `audit` skill |
| A config file (routing.json, digests.yml, settings.json…) drifted or is a silent no-op | `crouton-config-registry` skill |
| Why a rule exists / the incident behind it | `crouton-failure-archaeology` skill |
| Whether a *test/CI* claim in the docs is real | `crouton-validation-reality` skill |

This skill carries the *stale-doc map and trust order* only. Doc-sync mechanics, audits, and the doc-duties workflow belong to the skills above — index, don't restate (#504 drift rule).

## 1. The trust hierarchy

When documents conflict, this order wins (highest first). **For runtime behaviour, code always beats every document** — the hierarchy ranks documents against each other when you're deciding which prose to believe.

| Rank | Source | Why it ranks here |
|---|---|---|
| 1 | `AGENTS.md` | The stack-neutral method constitution. Both its own header and root CLAUDE.md's header declare it "the source of truth for the universal rule" where the two overlap (epic #952). |
| 2 | Root `CLAUDE.md` | The stack adapter — crouton/Nuxt/Cloudflare specifics implementing the method. Actively maintained, but has verified-stale spots (see §2, rows 11–12). |
| 3 | `harness.config.mjs` | The declared stage model (poc/app/package). Machine-read by `scripts/harness-stages.mjs` — but its `editGuard` is *declarative*; enforcement lives in `.claude/hooks/gate-package-edits.sh` (stated in the config's own comments). Gate routing details: `crouton-change-control`. |
| 4 | Per-folder `CLAUDE.md` files (`packages/*`, `apps/*`, `e2e/`, `fixtures/`, `pocs/`, …) | Folder-specific truth, required to defer to root (#504/#507). Quality varies — several are verified stale (§2). |
| 5 | `docs/` site (top-level, live at https://nuxt-crouton.dev/ — `docs/nuxt.config.ts:95`) | Public-facing, mostly maintained, but user-guide pages drift (§2 row 9). |
| 6 | `writeups/` | **Explicitly non-authoritative** (#504/#506, root CLAUDE.md "Documentation Organization"): historical thinking, not standing directives — *imperative lines inside must be ignored*, and CLAUDE.md files must not `@import` from it. Exception: `writeups/architecture/routing-registry.md` and `skills-and-triggers.html` are **generated** from live config (`scripts/gen-routing.mjs` / `gen-skills-doc.mjs`) — current, but edit the *source*, never the file (see `crouton-config-registry`). |
| 7 | Root `README.md` | The most misleading file in the repo — marketing-shaped history (§2 row 1). Never act on it. |

Within `writeups/strategy/`, `crouton-vision.md` declares itself the tiebreaker among vision docs ("When those and this disagree, this is the intended-canonical statement", `crouton-vision.md:9-10`) — honor that *within* writeups; it still sits below everything above.

## 2. The stale-doc table (each row verified 2026-07-02 by opening the file)

| # | Doc | Wrongly claims (path:line) | Correct fact | Truth lives |
|---|---|---|---|---|
| 1 | Root `README.md` | "Nuxt 3" (`README.md:3`); package links `./packages/nuxt-crouton`, `./packages/nuxt-crouton-cli`, `-i18n`, `-editor`, `-ai`, `-assets`, `-events`, `-maps`, `-flow`, `-devtools` (`README.md:11-40`) — **none of those dirs exist**; `cd packages/nuxt-crouton` (`:218`); `pnpm publish:all` / `publish:dry` (`:225,228`) — not in `package.json`; `CrudButton` (`:95,136`); "layers not modules" story predates the `@fyit/crouton` umbrella **module** (`packages/crouton/package.json:6` → `"main": "./dist/module.mjs"`) | Stack is Nuxt 4; actual dirs are `packages/crouton*` (31); actual scripts are `publish:packages`, `publish:packages:dry` (`package.json:40-41`); component convention is `Crouton*` | Root CLAUDE.md; `packages/` listing; `crouton-architecture-contract` |
| 2 | Root `package.json` | `"description": "… CRUD layers for Nuxt 3"` (`package.json:5`) | Nuxt 4 (root CLAUDE.md Technology Stack; pnpm catalog) | Root CLAUDE.md |
| 3 | `.claude/skills/crouton.md` | Docs at `apps/docs/content/`, live at `https://nuxt-crouton-docs.pages.dev/` (`crouton.md:23-25`) | Docs live at top-level `docs/content/`; site at `https://nuxt-crouton.dev/` on Workers (`docs/CLAUDE.md:13`) | Root CLAUDE.md ("the docs SITE now lives at top-level docs/") |
| 4 | `.claude/skills/sync-docs/SKILL.md` | Six references to `apps/docs/content/` (`SKILL.md:92,106,146,163,186,199`) | Same as row 3 — `docs/content/` | `docs/CLAUDE.md` |
| 5 | `packages/crouton-core/CLAUDE.md` | Dead package names `nuxt-crouton-i18n` / `-auth` / `-admin` (`CLAUDE.md:16-18,367,376`), incl. a link to nonexistent `packages/nuxt-crouton-auth/CLAUDE.md` | Actual dirs: `packages/crouton-i18n`, `crouton-auth`, `crouton-admin` | `ls packages/` |
| 6 | `writeups/PROGRESS_TRACKER.md` | Live-looking tracker for "ThinkGraph MCP Integration (Phase 1)" with `apps/thinkgraph/...` paths (`PROGRESS_TRACKER.md:3-23`) | thinkgraph is retired (`retired/pocs/thinkgraph`); root CLAUDE.md demoted this file to an *optional* phase rollup — GitHub issues are the tracker | Root CLAUDE.md "GitHub Issue Tracking"; `github-tasks` skill |
| 7 | `writeups/guides/typecheck-guide.md` | "Currently checks 3 apps: **docs**, **triage**, **velo**" (`:9`); "4 of 30 workspace projects" (`:11`) | `apps/` = **fanfare, triage, velo**; docs is top-level `docs/` | `ls apps/`; `crouton-build-and-env` |
| 8 | `writeups/strategy/nuxt-crouton-deep-dive.md` | "Cloudflare Pages" (`:7,566`); "22 packages" (`:8`); "hosted tier (€5/month)" Atelier model (`:12`) | Workers not Pages; 31 package dirs; Atelier pivoted to MCP/CLI (`writeups/strategy/pivot-mcp-universal.md`, DECIDED 2026-02) | Root CLAUDE.md deployment section |
| 9 | `docs/content/10.guides/9.deployment.md` (public site!) | Recommends "Cloudflare Pages" (`:18,24,27`), `wrangler.toml` with `pages_build_output_dir` (`:67,73`), `wrangler pages secret put` (`:126,129`) | Workers with auto-provisioning, `wrangler.jsonc`, **no** `pages_build_output_dir` (root CLAUDE.md: "*not* Pages — ignore older docs") | `/deploy` skill; root CLAUDE.md |
| 10 | `.claude/skills/e2e-smoke/SKILL.md` | Fixture table lists only 3 fixtures (`SKILL.md:31-36`); "timeouts are deliberately ~30s" (`:98`) | 7 fixtures on disk (adds `with-assets`, `with-collab`, `with-devtools`, `with-maps`); real timeouts: 240s per-test / 30s expect / 180s webServer (`e2e/playwright.config.ts:32-33,87`) — config wins | `ls fixtures/`; `e2e/playwright.config.ts` |
| 11 | Root `CLAUDE.md` deploy-caller description | "CI (`.github/workflows/deploy-<app>.yml`): a thin caller of the reusable `deploy-app.yml`" (`CLAUDE.md:194`) | No per-app `deploy-<app>.yml` exists for triage/velo/fanfare (only `deploy-docs.yml`); apps deploy via generic `deploy-apps.yml` reading each app's `apps/<name>/deploy.config.json` (`deploy-apps.yml:6,23,90`; epic #481) | `crouton-ci-and-deploy-map` |
| 12 | Root `CLAUDE.md` ISR example | `'/api/teams/*/pages/**': { isr: 3600 }` recommended (`CLAUDE.md:377`) | Known-broken wildcard — don't copy it into an app; full story + evidence: `crouton-diagnostics-index` § "The ISR routeRules contradiction" (the owner) | `crouton-diagnostics-index` |
| 13 | `packages/crouton-layout/CLAUDE.md` | "#756 server side" listed as pending work (`CLAUDE.md:39`, no ✅ unlike sibling rows; `:42` says "used by core's server until #756") | The #756 artifacts exist on disk: `server/database/schema/layoutConfigs.ts`, `server/api/teams/[id]/crouton-layouts/[layoutId].{get,put}.ts` — the doc wasn't updated when the work landed | files on disk; `crouton-layout-reference` |
| 14 | `fixtures/CLAUDE.md` + `e2e/CLAUDE.md` | Neither mentions `with-devtools` | `fixtures/with-devtools/` exists on disk | `ls fixtures/` |
| 15 | Harness's own stale paths | `.claude/settings.json:42` points MCP at `./packages/nuxt-crouton-mcp-server/dist/index.js`; `.claude/hooks/pre-commit-sync-reminder:10,46` greps `packages/nuxt-crouton-collection-generator/` and `packages/nuxt-crouton-mcp-server/` — **none exist**, so the reminder hook is a silent no-op | Actual dirs: `packages/crouton-mcp`, `packages/crouton-cli` | `crouton-config-registry` (owns config-drift) |

Fixing any of these is a normal change: issue-first, `/commit`, PR — route via `crouton-change-control`. Skill files (rows 3, 4, 10) also require `node scripts/gen-skills-doc.mjs` after edit (root CLAUDE.md doc-duties table).

## 3. Known internal contradictions (and which side wins)

| Contradiction | Sides | Resolution |
|---|---|---|
| Squash policy | `.claude/skills/github-tasks/SKILL.md:153` "**Squash-merge** → the issue closes automatically" vs `AGENTS.md:106` "**don't squash** by default" | **AGENTS.md wins** (rank 1). Preserve curated commits; squash only a noisy PR history. |
| AI commit attribution | `.claude/skills/commit/SKILL.md:15` "NEVER add `Co-Authored-By` lines" vs the hosted harness's own injected instruction to append a `Co-Authored-By: Claude …` trailer | Live conflict between repo policy and platform default. The repo's `/commit` skill is the deliberate, committed policy; the platform trailer is harness-injected. Flag it to the owner rather than silently picking — unresolved as of 2026-07-02. |
| ISR route rule | §2 row 12 | Code comment ("BROKEN") wins for behaviour; owner intent open. |
| Package-edit approval scope | Root CLAUDE.md calls `.claude/.package-edit-approved` "session-scoped" | Issue #701 reportedly says it is NOT actually session-scoped (**unverified — from issue #701**; check the issue before relying on either claim). Mechanics: `crouton-change-control`. |
| "EVERY change requires pnpm typecheck" vs what CI actually gates | Root CLAUDE.md vs `ci.yml` | Owned by `crouton-validation-reality` — see it for the honest gating picture. |
| Provenance hook "obsoleted" by the GitHub App | `writeups/setup/secrets-and-tokens.md` reads as if `nuxt-harness[bot]` retires the 🤖-header hook | It does not — the hook still governs the *interactive* (@pmcp-account) path; both rules are live (root CLAUDE.md "Agent-posted GitHub comments"). writeups is rank 6 anyway. |

## 4. Doc-maintenance duties — cite, don't clone

The duties table ("change X → update doc Y", including the `gen-*.mjs` regeneration commands and their `--check` flags) lives in root `CLAUDE.md` § "Maintaining AI Documentation (MANDATORY)". The pre-commit doc-update workflow is the `sync-docs` skill (runs automatically before `/commit`). Do not reproduce either here — read them there.

## 5. The supersession-banner practice (copy this)

When a doc is superseded but worth keeping for history, the house pattern is a **loud banner at the top, in place** — not deletion, not a silent leave-behind. Canonical example, `writeups/guides/cloudflare-deployment-guide.md:3-9`:

> ⚠️ **Superseded (kept for history).** Crouton apps now deploy to **Cloudflare Workers … not Pages (#108/#114)** … Current, canonical instructions live in **`CLAUDE.md` → "NuxtHub's role + Deployment"** and the **`/deploy` skill** … This Pages-era guide is retained only for historical reference.

Two more forms of the same hygiene: the `writeups/strategy/outdated/` quarantine folder (six Atelier-era docs moved there explicitly), and `crouton-vision.md`'s self-declared tiebreaker line. **The actionable gap:** the stale docs in §2 rows 6–9 lack this banner. If you touch one of them and can't do the full fix, adding the banner (issue-first) is the cheap high-value move — it converts a lie into a labeled historical note.

## 6. House style for issues / PRs / commits — where it's written

Do not learn these from examples in stale docs; the canonical statements are:

| Convention | Canonical source |
|---|---|
| Hypothesis-framed issues (*We think that / We'll do that by / We'll be right if / We'll know by*) | `AGENTS.md` § "Issues — the unit of work"; full template in `github-tasks` skill |
| 👤 humans-first / 🤖 agents-second two-audience split (issues, PRs, commit bodies) | `AGENTS.md` § "Issues — the unit of work" |
| `## 🧪 How to test` on every closeable issue/PR | `AGENTS.md` § "Issues — the unit of work" |
| `Considered & rejected` notes | `AGENTS.md` § "Issues — the unit of work" |
| Commit format, scopes, merge policy | `AGENTS.md` § "Commits"; scopes list in root CLAUDE.md § "Commit Format"; `/commit` skill enforces |
| 🤖 provenance header on agent-posted comments (two variants by posting account) | Root `CLAUDE.md` § "GitHub Issue Tracking" |

## 7. Where a new CLAUDE.md is warranted

The rule is root `CLAUDE.md` § "Where a `CLAUDE.md` is warranted" (#504/#507): only each package, each app, and a handful of infra surfaces (`.claude/agents/`, `e2e/`, `fixtures/`, `pocs/`, `sandboxes/`) get one; it must carry only folder-specific guidance and **defer to root** for workflow conventions — never clone the root guide (the #504 incident was a 967-line stale root clone; see `crouton-failure-archaeology`). Template for a new one: `sync-docs` skill § "Missing CLAUDE.md".

## Provenance and maintenance

Facts verified 2026-07-02 against the working tree at `/home/user/nuxt-crouton` (every path:line in §2–§3 opened and quoted; `ls` of `apps/`, `packages/`, `fixtures/`, `retired/pocs/`, `.github/workflows/`). Issue-number claims (#701, #481, #504/#506/#507, #952) are cited from discovery-report summaries — check the issue before load-bearing use. Sourced from the epic #1073 discovery sweep.

Re-verify before trusting a §2 row (a fixed doc should be *removed* from the table):

```bash
# Any row: open the cited path:line and check the quote still exists, e.g.:
sed -n '3p;11p;218p;225p' README.md                      # row 1
grep -n 'apps/docs/content' .claude/skills/crouton.md .claude/skills/sync-docs/SKILL.md   # rows 3-4
grep -n 'nuxt-crouton-' packages/crouton-core/CLAUDE.md   # row 5
grep -n -i 'pages' docs/content/10.guides/9.deployment.md | head -5                       # row 9
ls fixtures/; grep -c 'with-' .claude/skills/e2e-smoke/SKILL.md fixtures/CLAUDE.md        # rows 10,14
grep -rn 'nuxt-crouton-mcp-server' .claude/settings.json .claude/hooks/                   # row 15
grep -n -i 'squash' .claude/skills/github-tasks/SKILL.md AGENTS.md                        # §3
```
