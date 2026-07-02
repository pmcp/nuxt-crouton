---
name: crouton-config-registry
layer: stack
description: The catalog of every config-as-data surface in nuxt-crouton — which file controls what, who actually reads it, its drift hazards, and how to change it safely. Use when asking "where is X configured", "who reads this file", "what happens if I edit harness.config.mjs / routing.json / digests.yml / labels.yml / a deploy.config.json / an e2e.manifest.json", when a setting change had no effect (silent no-op), when adding a new config surface, or when a gen-*.mjs --check fails. Trigger phrases: "where do I configure", "what reads this config", "config drift", "the setting didn't do anything", "stale generated doc", "add a new config-as-data surface".
---

# crouton-config-registry

One-line purpose: the master index of every configuration axis in this monorepo — file → what it controls → who READS it → drift hazard → how to change it safely.

Background for a fresh session: this repo deliberately prefers **config-as-data** (versioned, PR-reviewed files read by deterministic scripts) over hosted settings UIs or workflow-embedded constants. That means the answer to "where is X configured" is always a file — but several files have *no live reader* (silent no-ops, cataloged below), and several generated artifacts drift unless their `--check` mode is run. This skill is the map.

## When to use / when NOT to use

Use this skill to locate a config surface, find out who consumes it, or check whether an edit will actually take effect.

Do NOT use it for the depth those surfaces' owners carry:

| Topic | Go to instead |
|---|---|
| `wrangler.jsonc` anatomy, `deploy.config.json` semantics, secrets/tokens, workflow inventory | sibling `crouton-ci-and-deploy-map` |
| `pnpm-workspace.yaml` catalog/overrides rationale, install traps | sibling `crouton-build-and-env` |
| `crouton.config.js` / `schemas/*.json` field format, what generation produces | sibling `crouton-generation-reference` (workflow: the `crouton` skill) |
| What `croutonApps` / `croutonCollections` / `croutonLayoutBlocks` *mean* architecturally | sibling `crouton-architecture-contract`; layout blocks: `crouton-layout-reference` |
| The ISR/routeRules breakage itself | sibling `crouton-diagnostics-index` (§ "The ISR routeRules contradiction") |
| Which sign-off gate a change needs, packages-edit approval mechanics | sibling `crouton-change-control` |
| Digest content/cadence mechanics | the `housekeeping`, `epic-digest`, `skills-digest` skills |

Trust order when sources disagree: see sibling `crouton-docs-trust-map` §1.

## Master index (all paths repo-relative; verified 2026-07-02)

### A. Harness configuration (`.claude/`, `.github/`)

| File | Controls | Read by | Drift hazard |
|---|---|---|---|
| `harness.config.mjs` (repo root, 79 lines) | The **stage model** (epic #952): stage → path prefixes → required/opt-in gates → deploy target → `editGuard`. Default profile: `poc`→`pocs/` (no gates, preview), `app`→`apps/` (test-first opt-in, staging), `package`→`packages/` (test-first required, `editGuard: true`, no deploy) + `unstaged` fallback | `scripts/harness-stages.mjs` (resolver + `stageForPath`/`gateMode` exports; contract test `scripts/harness-stages.test.mjs`). Referenced (not imported) by `.claude/agents/task-worker.md` and several skills | The packages-edit hook `.claude/hooks/gate-package-edits.sh` **hardcodes `packages/*` on purpose** (perf — no Node spawn per Edit/Write; #955). Rename/repoint the `package` stage here and the hook is out of sync until you edit it too — both files document this |
| `.claude/routing.json` | Model-routing registry (#864): `tiers` (small=haiku / medium=sonnet / large=opus + pi equivalents), `routes` per agent (tier + `proposed` + why), `overrides`. **DESCRIPTIVE, not prescriptive** (its own `_about`): it mirrors `.claude/agents/*.md` frontmatter; changing a model still means editing the agent file, then regenerating | `scripts/gen-routing.mjs` (→ `writeups/architecture/routing-registry.md`; `--check` fails on stale registry OR tier drifting from agent frontmatter). CI: `routing-registry.yml`. JSON not YAML so the check job needs zero deps (#1062) | Its `_known_gaps` field states plainly: the top-level CI agent loop (`claude.yml`, `decompose-on-issue.yml`, fix-ci, daily sweeps) runs on the claude-code-action **DEFAULT model — UNPINNED**. Routes only cover the 6 named agents |
| `.claude/settings.json` | Wires exactly 4 hooks (PreToolUse `Edit\|Write` → `gate-package-edits.sh` + `gate-spec-signoff.mjs`; PreToolUse `mcp__github__add_issue_comment` → `require-comment-provenance.mjs`; SessionStart → `session-start.sh`) + 3 `mcpServers` entries | The Claude Code harness itself | **STALE (verified 2026-07-02):** the `crouton` MCP server points at `./packages/nuxt-crouton-mcp-server/dist/index.js` — **that directory does not exist** (real package: `packages/crouton-mcp/`). The MCP server silently fails to start. See § "Silent no-ops" |
| `.claude/hooks/pre-commit-sync-reminder` | Optional **git** pre-commit reminder (manual install; not wired by settings.json) | git, only if a human ran `cp` / `core.hooksPath` | **SILENT NO-OP (verified):** greps `^packages/nuxt-crouton-collection-generator/(lib\|bin)/` (line 10) and `^packages/nuxt-crouton-mcp-server/src/` (line 46) — neither directory exists (real: `crouton-cli`, `crouton-mcp`). Never fires even when installed |
| `.github/digests.yml` | Cadence + delivery per recurring report, as data: `housekeeping: daily/[issue]`, `epic-digest: daily/[email]`, `skills-digest: monthly:1/[email]`, `eval-scoreboard: weekly:mon/[issue]`. Schema: `schedule: daily\|weekly:<dow>\|monthly:<dom>` (UTC, dom clamped), `deliver: [issue\|email]`, optional `to:` | `.claude/skills/housekeeping/schedule.mjs`, invoked by workflows `housekeeping.yml`, `skills-digest.yml`, `eval-scoreboard.yml` — each cron fires **daily as a cheap wake-up** and `schedule.mjs` exits early on non-send days | **Editing workflow `cron:` is the wrong move** — edit this file. Exception: `epic-digest.yml` hard-codes its own daily cron and does NOT call `schedule.mjs`; its entry here is declared intent only (follow-up #637) |
| `.github/labels.yml` (78 labels) | The label taxonomy: `pkg:*` / `app:*` / `poc:*` / `worker:*` mirrors of the source dirs, plus `type:*` / status / meta labels | `labels.yml` workflow (crazy-max/ghaction-github-labeler, `skip_delete: true` — never removes); coverage-checked by `labelCoverage()` in `.claude/skills/housekeeping/gather.mjs:105` (compares source dirs on disk vs declared labels; report-only) | New package/app/poc dir without a matching label = housekeeping-report finding, not a build failure. Known doubled entries: `app:alexdeforce`/`app:kvr`/`app:sintlukas` exist though those apps live under `pocs/` (harmless — from ci-deploy discovery; parallel `poc:` labels exist) |
| `.claude/launch.json` | Per-app dev-server launch configs (name, `pnpm --filter <app> dev`, port) | Editor/launcher tooling; no repo script reads it | Contains stale app names (e.g. `apps/alexdeforce`, now a poc). Low stakes |

### B. Per-app configuration (`apps/<name>/`, same shape in `pocs/` and `fixtures/`)

| File | Controls | Read by | Drift hazard |
|---|---|---|---|
| `crouton.config.js` | Generation input: `features` (which `@fyit/crouton-*` packages to enable), `collections` (name + `fieldsFile` + options like `formComponent`, `hierarchy`), `targets` (layer → collections), `dialect` | `crouton config` (the CLI, `packages/crouton-cli/lib/generate-collection.ts`, loaded via c12); also probed by `packages/crouton/src/module.ts` and `packages/crouton-core/nuxt.config.ts` hooks | `fieldsFile` paths resolve relative to the **config file**, but output lands in **cwd** — run the CLI from inside the app. Format/details: sibling `crouton-generation-reference` |
| `schemas/*.json` (fieldsFiles) | The field definitions per collection — the data model | The CLI via `crouton.config.js`. Changing one = a schema change → **Schema sign-off gate (#314)** applies (see `crouton-change-control` / `schema-review` skill) | Editing a schema without regenerating leaves generated code stale; regenerating without sign-off skips a gate |
| `app/app.config.ts` | The three runtime registries (defu-merged across layers): `croutonCollections` (app registers each generated `*Config`; verified in `apps/velo/app/app.config.ts`), `croutonApps` (addon packages self-register, e.g. `packages/crouton-bookings/app/app.config.ts:161` — powers `useCroutonApps().hasApp()` detection), `croutonLayoutBlocks` (packages contribute layout blocks; present in core/layout/bookings app.configs) | Nuxt at runtime; `useCroutonApps`, the layout engine, collection machinery | The generator **upserts** `croutonCollections` entries on generate — hand edits near those imports can be clobbered/duplicated. Semantics: sibling `crouton-architecture-contract` |
| `deploy.config.json` | Opt-in unit for CI deploys: `stagingUrl`, `productionUrl`, `layerPackages`, `watchPaths`, optional `smoke.required` | `.github/workflows/deploy-apps.yml` `detect` job | Owned by sibling `crouton-ci-and-deploy-map` (exists for apps fanfare/triage/velo + 3 pocs) |
| `wrangler.jsonc` | Cloudflare Workers bindings (top-level = prod, `env.staging` = staging; id-less until first deploy auto-provisions, then `scripts/sync-wrangler-ids.mjs` writes ids back — **commit them**) | wrangler / Nitro `cloudflare_module` preset / the app's `cf:*` scripts | Anatomy, nitro#3429 env-stripping, and the #138 migrate gotcha: sibling `crouton-ci-and-deploy-map` |
| `nuxt.config.ts` `routeRules` | ISR/SWR/prerender caching per route | Nitro | ⚠️ **Do NOT add wildcard `/api/teams/*/...` rules** — breaks ALL generated `/api/teams/:id/*` routes via a radix3 conflict (live warning at `apps/velo/nuxt.config.ts:75-77`); root CLAUDE.md's ISR example recommends exactly the broken pattern. Full story: sibling `crouton-diagnostics-index` |

### C. Per-package and per-fixture

| File | Controls | Read by | Drift hazard |
|---|---|---|---|
| `packages/*/crouton.manifest.ts` (25 exist) | Package self-description via `defineCroutonManifest` (from `@fyit/crouton-core/shared/manifest`): `id`, `bundled`, `fieldTypes` (+ `aliases` — canonical field-type source, e.g. core's `string/text/number/.../file`), `autoGeneratedFields`, reserved names, `provides`, `detects` | Two consumers: the meta module `packages/crouton/src/module.ts` (regex-scans `packages/crouton-*` + `node_modules/@fyit/crouton-*` for `id`/`bundled`) and the CLI's type mapping `packages/crouton-cli/lib/utils/manifest-loader.ts` (jiti-loads, caches) | Adding a field type = manifest change, not a CLI hardcode. The meta scan is **regex, not import** — keep `id:` / `bundled:` literal. Field-type catalog: sibling `crouton-generation-reference` |
| `fixtures/<name>/e2e.manifest.json` (7 exist) | What the fixture smokes: `packages` (drives PR-affected fixture selection), `collections` (key/heading/create/requiredField for the generic CRUD spec), `i18n` block | `.github/workflows/e2e.yml` `detect` job (jq over `.packages`); the generic specs `e2e/collection.smoke.spec.ts`, `e2e/surface.smoke.spec.ts`, `e2e/helpers.ts` | A new fixture without a manifest is invisible to the smart selection. Format reference: `e2e/CLAUDE.md`, `fixtures/CLAUDE.md`, `e2e-smoke` skill |

### D. Workspace-wide toolchain

| File | Controls | Read by | Drift hazard |
|---|---|---|---|
| `pnpm-workspace.yaml` | Workspace globs + the `catalog:` block (single source of shared dep versions, #142) | pnpm | Stale `examples/*` glob (no such dir, harmless). Catalog/pins depth + the deliberately-uncataloged families: sibling `crouton-build-and-env`; change flow: `dependency-sweep` skill |
| root `package.json` `pnpm.overrides` / `onlyBuiltDependencies` / `ignoredBuiltDependencies` | Workaround version pins (exact pins `unimport 4.1.1`, `zod 4.2.1`, `youch`, tiptap trio) and the build-script allowlist (only `better-sqlite3` builds) | pnpm | Don't "upgrade" exact pins casually — sibling `crouton-build-and-env` |
| `vitest.config.ts` (root, 14 lines) | Test **projects** = `packages/*/vitest.config.ts` (each package with a vitest config is a project); excludes `node_modules/dist/.nuxt` | `pnpm test` (= `vitest run`) and CI `ci.yml` `test` job | A package without its own `vitest.config.ts` has no tests in the sweep — silently untested. Coverage reality: sibling `crouton-validation-reality` |
| `eslint.config.mjs` (root) | Lint for `packages/*` only (`dirs.src: ['packages']`) via `@nuxt/eslint-config/flat` + stylistic (no Prettier) + **all `eslint-plugin-vuejs-accessibility` recommended rules at `warn`** (epic #726, warn-first) | `pnpm lint`; apps carry their own `eslint.config.mjs` | Root lint does NOT cover `apps/`; a11y rules are warnings, not errors ("tighten to error once backlog cleared" — still open) |

### E. Generated artifacts and their `--check` modes

Each `scripts/gen-*.mjs` renders a config file into a committed artifact; `--check` fails when stale. **Actual exit status, run 2026-07-02:**

| Generator | Source → artifact | CI wiring | `--check` on 2026-07-02 |
|---|---|---|---|
| `scripts/gen-skills-doc.mjs` | skill frontmatter + its in-file `META`/`FLOWS` maps → `writeups/architecture/skills-and-triggers.html` | `skills-doc.yml` (PRs touching `.claude/skills/**`); also imported by `skills-digest` (#841) | **exit 1** — HTML stale (the in-flight #1073 knowledge-library skills, this one included, aren't registered/regenerated yet). Note the asymmetry: a skill missing from `META` is only a `console.warn` (lands "Uncategorised"), but a `FLOWS` entry naming a deleted skill **hard-fails** (gen-skills-doc.mjs:439-443) |
| `scripts/gen-routing.mjs` | `.claude/routing.json` → `writeups/architecture/routing-registry.md` (+ frontmatter-drift check) | `routing-registry.yml` | **exit 0** ("routing registry current; no drift") |
| `scripts/harness-layers.mjs` | `layer:` frontmatter of every skill/agent → inventory (`--json`); legacy no-frontmatter skills via its hardcoded `OVERRIDES` | **NONE — despite its own header claiming "--check … (CI)"**: `grep -rl harness-layers .github/` → zero hits (verified) | **exit 1** — `graduate` and `skills-digest` carry no `layer:` tag. State this plainly: the layer check is documented as CI-enforced but is enforced nowhere, and it currently fails |
| `scripts/gen-package-catalog.mjs` | package CLAUDE.md files → `.claude/skills/task-decompose/package-catalog.md` (#292 package-fit check) | none (root CLAUDE.md mandates running it on package add; no workflow) | **exit 0** ("package-catalog.md is up to date") |

Re-run all four in one line:

```bash
for s in gen-skills-doc gen-routing harness-layers gen-package-catalog; do node scripts/$s.mjs --check; echo "$s exit=$?"; done
```

## Silent no-ops (config that looks live but isn't) — verified 2026-07-02

1. `.claude/settings.json` → `mcpServers.crouton` → `./packages/nuxt-crouton-mcp-server/dist/index.js` — path does not exist (`ls` errors); real package is `packages/crouton-mcp/`. The crouton MCP server never starts from this entry.
2. `.claude/hooks/pre-commit-sync-reminder` — both greps target long-renamed package dirs (`nuxt-crouton-collection-generator`, `nuxt-crouton-mcp-server`); can never match. Its README (`.claude/hooks/README.md`) cites the same dead paths.
3. Root `package.json` `typecheck:mcp` filters `nuxt-crouton-mcp-server` — the package is named `@fyit/crouton-mcp`, so the filter matches nothing (CI uses the correct name directly).
4. `scripts/harness-layers.mjs --check` — self-describes as a CI guard; wired into no workflow (and currently failing, see table E).
5. `epic-digest`'s entry in `.github/digests.yml` — declared intent only; the workflow hard-codes its own cron and never consults `schedule.mjs` (#637).
6. The `ui-approved` label — inert by design; only a reply *comment* containing `lgtm`/`approve` resumes anything (#572; see `crouton-change-control`).

Fixing any of these is a normal issue-first change (open the issue before editing — see `crouton-change-control`); this skill only indexes them.

## How to change a config surface safely (checklist)

1. **Find the reader first** (tables above; when in doubt: `grep -rln '<filename>' scripts/ .claude/ .github/`). A config file nobody reads is a doc, not a control — editing it changes nothing.
2. **Check for a paired generated artifact** (table E). If one exists: edit the source, run the generator, commit **both**.
3. **Check for a hardcoded twin.** Two known: `gate-package-edits.sh` hardcodes `packages/*` (twin of `harness.config.mjs` `editGuard`); the `META`/`FLOWS` maps in `gen-skills-doc.mjs` are the out-of-band twin of skill frontmatter (frontmatter carries no trigger/group).
4. **Route through the right gate** — schema files → schema sign-off; `packages/*` files (incl. `crouton.manifest.ts`) → the packages-edit guard; see `crouton-change-control`.
5. **Verify the effect, not the edit** — e.g. after a `digests.yml` change, `node .claude/skills/housekeeping/schedule.mjs` locally; after a stage change, `node scripts/harness-stages.mjs <path>`.

## Adding a NEW config-as-data surface (the house pattern)

Modeled on `digests.yml` and `routing.json` (both files state the rationale in header comments):

- A versioned, PR-reviewed file with a **self-documenting header comment** (why it exists, field schema, who reads it) — never a hosted UI, never constants buried in a workflow.
- A **dependency-free Node reader** (`scripts/*.mjs` or a skill-local `*.mjs`) — CI check jobs never install `node_modules`.
- If it renders an artifact: give the generator a `--check` mode **and actually wire it into a workflow** (the harness-layers gap above is the cautionary tale).
- Register the surface: root CLAUDE.md "Maintaining AI Documentation" table + this skill's index.

## Provenance and maintenance

Facts verified 2026-07-02 against the working tree: read in full — `harness.config.mjs`, `.claude/routing.json`, `.claude/settings.json`, `.github/digests.yml`, `vitest.config.ts`, `apps/velo/{crouton.config.js,deploy.config.json,wrangler.jsonc,app/app.config.ts}`, `fixtures/minimal/{crouton.config.js,e2e.manifest.json}`, `packages/crouton-core/crouton.manifest.ts` (head), `eslint.config.mjs` (head), `pnpm-workspace.yaml`, root `package.json` (pnpm block). Ran — all four `--check` modes (exit codes as stated), `node scripts/harness-stages.mjs` (poc + package paths), `grep -rl harness-layers .github/` (empty), `ls packages/nuxt-crouton-mcp-server` (ENOENT), greps confirming: pre-commit-reminder dead paths (lines 10/46), `schedule.mjs` callers (3 workflows, epic-digest absent), `e2e.manifest` readers (e2e.yml + 3 e2e specs), `crouton.manifest` consumers (meta module + manifest-loader), `labelCoverage()` (gather.mjs:105), 25 manifests, 7 fixture manifests, 78 labels, `.claude/.package-edit-approved` gitignored (line 118). From discovery reports, cited not reproduced: the labels.yml doubled `app:*`/`poc:*` entries list; routing A/B history (#824). Volatile facts — re-verify before trusting:

```bash
for s in gen-skills-doc gen-routing harness-layers gen-package-catalog; do node scripts/$s.mjs --check; echo "$s exit=$?"; done
ls packages/nuxt-crouton-mcp-server 2>&1        # still ENOENT? settings.json still stale?
grep -rln harness-layers .github/                # still unwired?
node scripts/harness-stages.mjs packages/crouton-core/x.ts   # stage model unchanged?
grep -c '^- name' .github/labels.yml             # label count
ls packages/*/crouton.manifest.ts | wc -l ; ls fixtures/*/e2e.manifest.json | wc -l
```

The gen-skills-doc exit-1 and the two untagged skills are expected to change as epic #1073 lands (this library must itself be registered in `META` + tagged + the HTML regenerated). When that happens, update table E rather than trusting these date-stamped exit codes.
