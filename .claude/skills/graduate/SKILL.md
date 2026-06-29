---
name: graduate
description: Turn a proven POC into a real, test-first, documented package (or packages) plus a consuming app — the deliberate "step back and rebuild" checkpoint after heavy POC iteration. Starts with a handoff brief (what it does · features · gotchas), then rebuilds test-first (the #774 gate), emits app + package(s), documents, and promotes. Use when a `pocs/*` app is proven and "done", or when asked to "graduate this poc", "make it a real app", "extract the package", "turn the spike into a package".
allowed-tools: Read, Grep, Glob, Bash, mcp__github__issue_read, mcp__github__issue_write, mcp__github__sub_issue_write, mcp__github__add_issue_comment, mcp__github__list_issues, mcp__github__search_issues, mcp__github__get_label
---

# Graduate — turn a proven POC into real, test-first packages + an app

A POC (`pocs/*`) is an **incubator**: messy, churny, safe-to-fail code built to
*learn the right shape* against a real use case (`pocs/CLAUDE.md`). Graduation is
the deliberate moment we **throw the scaffolding away and rebuild clean** from what
we learned. The output is **an app AND one or more packages** — the app is the
proving consumer, the **packages are the durable value** (sometimes opinionated /
crouton-shaped, sometimes broadly reusable for the Nuxt / Nuxt UI ecosystem). *Once
the app is done right, the package is done right too.*

> **Why this is the test-first moment.** The usual objection to TDD — "we don't yet
> know what it should do" — is gone: the POC *proved* the behaviour. So the proven
> behaviours become the **test spec**, and we build to green. The #774 Test Sign-Off
> gate is *off* in `pocs/*` and *on* in `packages/*` precisely so it fires here.

This skill does **not** auto-merge or auto-deploy. It produces the brief, the
issue tree, the test-first plan, and drives the rebuild under the existing gates.

## When to run

- A `pocs/<name>` app is proven and the owner calls it "done" (the API has settled,
  the pattern is worth reusing).
- The branch has iterated a lot (many `spike-*` builds) and the code has accreted —
  the worst outcome would be copying it into `apps/`.

If the POC is still being explored, it's **too early** — say so and stop.

## The flow

### 1. Handoff brief (the spec the rebuild reads cold)

Before any rebuild, write the brief — the artifact a *fresh session/agent* needs to
understand the POC without re-deriving it from `spike-a … spike-z`. This **extends
`/postmortem`** (run that first if the epic is closing).

**If the POC kept a living `<poc>/HANDOFF.md` (the `pocs/` convention), that IS the brief's
backbone — start from it, don't re-derive cold.** It was curated to current truth as the POC was
built (signed-off decisions in, superseded ones pruned) and already carries the design decisions,
gotchas, and graduation requirements. Reconcile it against the code, then expand into the briefing
below (add the per-unit shape call + test checklist). No `HANDOFF.md`? Reconstruct from the spike.

Capture:

- **What it does** — one paragraph, plain language.
- **The features** — the proven behaviours, as a checklist (each becomes ≥1 test).
- **Watch out for** — the gotchas, dead-ends, and "looks done but isn't" traps found
  while iterating (e.g. timing races, mobile-only bugs, framework quirks).
- **The shape call** — which behaviours are reusable (→ `packages/*`) vs app-specific
  (→ the app), and for each package whether it's *opinionated* or *ecosystem-grade*.

Write it to `writeups/briefings/<name>-graduation-brief.md` and link it on the epic.
**This brief is the single source of truth for steps 2–5** — don't re-read the spike.

### 1.5 Reconcile the brief against the running POC (gate)

**Before the brief is frozen, prove it against the live app — in BOTH directions.** A brief checked
only as a *checklist* can confirm only what we remembered to write; it can't catch what we
forgot. So an exploratory agent (powered by `/verify` + the `e2e-smoke` boot harness + the headless
browser) drives the running POC and reports three buckets:

- **Confirmed** — a documented behaviour that actually works in the app. ✅
- **Contradicted** — the doc says X, the app does Y. → fix the doc (or the POC) until they agree.
- **Undocumented** — behaviour the app has that the brief/`HANDOFF.md` *doesn't mention* (the
  **unknown-unknowns**). → add it, or consciously drop it. This is the bucket a checklist misses and
  the whole reason this step exists.

**Drive what's drivable; code-confirm the rest (don't over-promise a full live drive).** Visible /
static states (a rendered board, a badge, a readout) you can drive and screenshot cheaply with the
headless browser — do that. But *gesture* states (a dwell-armed snap, a drop-ghost, a detach-pull) are
impractical to reproduce headlessly; confirm those by **reading the code** and say so honestly in the
report. The stable hooks below are precisely what let the rebuild's e2e close the loop on the states
you couldn't drive live — so "both directions" means *visible-driven + gesture-code-confirmed + hooks
planted*, not a literal end-to-end gesture drive. (Builder graduation, #983 WS1.)

Reconcile until all three are clean: the brief + `HANDOFF.md` must read as *current truth*, complete.
Only then is the brief safe as the rebuild's single source of truth.

**Stable element hooks (output of this pass, not upfront busywork).** Wherever the agent *struggles to
locate* a state (the armed snap, a ghost slot, an active badge), add a stable `data-testid` /
`data-handoff` on that element and name it in the brief. These become the **shared vocabulary** the
brief, the reconcile/parity agent, and the derived e2e tests all target — and the rebuild (step 3)
**reproduces the same hook names**, so the same agent runs identically against the POC *and* the
graduated app. (Hooks are the right "references to elements" — NOT `file:line` code refs, which rot
and pull the rebuild toward copying the spike.)

> Needs an environment that can actually run the POC (a sandbox that kills long-running dev servers
> can't host this — run it where `pnpm dev` / a staging preview stays up). The POC being runnable is
> exactly why a screenshot layer is unnecessary: the live app is the visual ground truth.

### 2. Open the graduation epic

Per `github-tasks`: an **epic** + a **sub-issue per extracted package and the app**
(hypothesis-framed). Label each by its target package/app. The POC's epic is the
*input*; this new epic is the *output*. Reference the brief.

### 3. Rebuild test-first (per extracted unit)

For each `packages/*` unit in the brief:

0. **Survey the target package FIRST — especially a contribution to an *existing* package.** Before
   writing tests, read what the target `packages/*` already provides (types · validators · utils ·
   storage · adjacent tested helpers) so you build *on* it, not *over* it. The reconcile gate (1.5)
   checks the POC against the docs; it does **not** check the brief against the package you're
   graduating *into*. A brief that says "the model exists, just add X" is routinely half-true — the
   package often already has the neighbouring pieces (e.g. a sanitiser/validator to pair a new
   serialiser with, a round-trip-stable bridge, a storage table). Re-scope the unit to the **genuine
   gap** and reuse the rest (one allowlist, no reinvention). Record the re-scope on the issue.
   (Builder graduation, #983 WS4: serialisation was narrower than briefed because `sanitizeLayoutTree`
   + the pieces↔tree bridge + `layout_configs` already existed.)
1. **Write the failing test(s) first** from the feature checklist → `/test-review`
   (the #774 gate) to sign off on the behaviour. The agreed test is the contract.
2. **Build to green** — a clean implementation, **re-derived** from the POC, not
   ported. Resist copy-pasting `spike-*` files; the brief + tests are the spec.
   Reproduce the **stable element hooks** named in the brief (step 1.5) so the parity
   pass and the e2e tests target the same vocabulary on the new app.
3. Respect the package boundary (the `packages/` edit gate), `pnpm typecheck`, and
   the data-model / UI gates where they apply (`/schema-review` #314, `/ui-proposal`
   #307).

### 4.5 Parity check on the rebuilt app (gate)

Run the **same exploratory agent from step 1.5** against the *graduated* app and reconcile it to the
brief — same three buckets (confirmed / contradicted / undocumented). This catches what the rebuild
**dropped or drifted** (step 1.5 catches what the *handoff* forgot; this catches what the *rebuild*
lost). Don't promote until parity is clean.

### 4. Document as you go

Each new/changed package gets a real `CLAUDE.md` (Purpose · Key Files · Conventions)
— the AI-docs discipline the POC deliberately skipped. New package ⇒ also
`node scripts/gen-package-catalog.mjs` and a `pkg:*` label.

### 5. Promote + deploy

Promote `pocs/<name>` → `apps/<name>` (or scaffold a fresh app) — it now takes on the
`apps/` rules, the `app:*` label, full CI / two-domain deploy. Use `/deploy`. The POC
can then be retired (`/remove-app`) once the app supersedes it.

## What you hand back

- `writeups/briefings/<name>-graduation-brief.md` (what · features · gotchas · shape).
- A graduation epic + sub-issues (one per package + the app).
- A test-first plan: the feature checklist mapped to signed-off tests.
- The promotion path (which packages, which app).

## Conventions

Defers to the **root `CLAUDE.md`** for all workflow/commit/issue conventions
(ISSUE-FIRST, `/commit`, no-squash merges, the `packages/` edit gate, test-first
#774). Reuses `/postmortem`, `/test-review`, `/schema-review`, `/ui-proposal`,
`/deploy`, `/remove-app`. This skill is the *orchestration* of that graduation
checkpoint — it doesn't replace any of them.
