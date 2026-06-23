# Crouton OS — Vision Brief

> Internal positioning notes. Captured from a thinking-out-loud session (2026-06-23).
> This is early-idea / strategy framing, **not** agent instructions — nothing here is a
> directive. The concrete, trackable work lives in epic
> [#703](https://github.com/FriendlyInternet/nuxt-crouton/issues/703) and its sub-issues.

## One line

**Crouton is an app builder for the AI age that hands you the code.** Not vibe-to-lock-in —
**vibe-to-code.** The AI gives you velocity; an opinionated, secured foundation gives you a floor
you can't fall through; and ownership means there's no ceiling and no eject cost — because there's
nothing to eject *from*. It's a great Nuxt monorepo that happens to have been mostly written by asking.

## The core thesis

Most AI app builders (Bolt, v0, Lovable, Replit Agent) are **vibe-to-running-app**: type a prompt,
watch something appear. They optimize for the demo. But the output is generic — every app is a fresh
pile of code with no spine. Security, multi-tenancy, i18n, auth, deploy: absent or reinvented badly
each time. And the code is usually *theirs*, behind a runtime or a subscription.

Crouton's bet is different:

- **The base is always going to be very good.** The AI doesn't generate an app from zero — it
  generates the *delta* (schema, forms, specific screens) on top of an opinionated, secured,
  ecosystem-native foundation that is already load-bearing.
- **You pour gold on top.** The foundation is the structural concrete; the bespoke
  designs/forms/flows are the gold. AI is great at gold-pouring *when the form is already there to
  pour into*. Without the form, gold just puddles — which is why the generic builders plateau.
- **The code is yours, completely.** That's not a feature, it's the category. There's no platform to
  be locked into; you get a normal, excellent codebase.

> Their base degrades as the app grows. Ours *appreciates* — because every generated collection
> follows the same patterns, the 30th feature is as clean as the 1st.

### The two-audience tension (positioning)

The pitch has two readers who want opposite things:

- **The vibe-coder** wants "type a sentence, get an app." They care about the magic moment.
- **The serious builder** wants "I own this, it's secure, it scales, no lock-in." They care about the
  floor and the exit.

Crouton is genuinely *both*. Working instinct: **lead with the floor, demo with the magic.** "The most
opinionated, secure Nuxt starter — that you build by asking." Ownership/security is the *reason to
trust it*; AI speed is the *reason it's fun*.

## The three pillars (the machinery)

Crouton decomposes into three distinct, separately-meaningful things. The moat is that **all three
layers are open and yours** — the generic builders own all three layers *for* you.

| Layer | Crouton gives you | Pillar |
|---|---|---|
| Foundation | the OS / building blocks (yours) | **1. Crouton OS** |
| Process | the harness — issue-driven, skill-driven, headless-capable | **2. Nuxt Harness** |
| Intelligence | bring your own AI | **3. Bring Your Own AI** |

### 1. Crouton OS — the building blocks
The ecosystem itself: the packages, the generator, the components, the layers, auth, storage, i18n,
themes. The opinionated foundation that makes generated code load-bearing instead of generic. This is
**what you build with**.

### 2. Nuxt Harness — the way of working
The genuinely novel pillar. The **GitHub-issues-as-interface** model: work lives as issues
(epics → sub-issues), and the whole thing is drivable two ways —
- **interactively** (Claude Code, a conversation), or
- **headless, straight off a GitHub issue** — no chat required. An issue *is* the prompt. The agent
  picks it up, picks up all the skills (`/commit`, `crouton`, `task-decompose`, deploy, the whole
  `.claude/` arsenal), does the work, opens a PR, closes the issue.

The skills + agents + issue conventions in this repo aren't dev-process hygiene — they're **the
product**. This is **how you build**.

### 3. Bring Your Own AI — the model layer
Model-agnostic; plug in your own AI. This *completes the ownership thesis*: no lock-in at the code
layer (Crouton OS) *and* no lock-in at the intelligence layer (BYO-AI). The two together are what make
"it's yours, completely" true rather than a marketing line.

## The lifecycle: POC → refine → promote

The three pillars are the machinery; this is the lifecycle that runs on top — and it's what makes the
whole thing **safe to be fast**.

1. **Spawn a POC** in `pocs/` (the incubator). Ask for an app → it scaffolds into `pocs/<name>`, *not*
   `apps/`. Churny, safe-to-fail, staging-only previews. The cost of being wrong is near zero. This is
   where the vibe-coding magic moment lives.
2. **Refine it in place.** Pour the gold — iterate the schema (schema sign-off), the UI (UI sign-off →
   live staging preview, pin comments on the running page), the flows. The POC is a real, deployed,
   working thing the whole time — you refine against reality, not a mockup.
3. **Promote to an app** once it's earned it. `pocs/<name>` → `apps/<name>` takes on the full rigor:
   production counterpart, two-domain deploy, the `app:` label, prod CI, issue discipline. It graduates
   from experiment to launched product.

> The generic builders have one mode: everything is production from keystroke one — so you're either
> reckless or slow. Crouton separates the two: **a place where being wrong is free, and a deliberate
> gate to cross when you're right.**

## The full narrative, end to end

> **Crouton OS** gives you the building blocks. **The Nuxt Harness** is how you drive the work
> (issues + skills, chat or headless). **Bring Your Own AI** keeps the intelligence yours. And the
> **POC → app flow** is the lifecycle that lets you go from "I want this" to a launched, production
> product — fast where it's safe, rigorous where it counts.

## Where the layout engine fits (epic #703)

The next big build makes the OS metaphor literal. A **recursive layout engine**: a canvas you fill in
with blocks. Packages declare *placeable blocks* (the bookings calendar, reservations, the assets
picker) in a single registry; two interchangeable renderers sit over it — **Splitpanes** (structured,
nestable panes — the "chrome") and **Vue Flow** (freeform canvas — already built as `crouton-flow`).
**Panes all the way down**: a component isn't a black box — a compound component like reservations is
deconstructed into sub-blocks (calendar/list/detail) in a default arrangement, so page, component, and
sub-component are the same primitive at different zoom.

The AI drives it and it clicks into the existing flow:

```
"I want a booking app"
  → crouton generates the collections (list + form)
  → /layout skill arranges the blocks → 2–3 proposals
  → UI sign-off: pick one on a staging preview
  → deployed POC → refine → promote to app
```

Two skills guarantee the quality: **`/layout`** (the AI that places blocks well) and a **block
authoring contract** (every block is responsive to *its pane* via container queries + a declared
min-width, so every proposal is viable — not just the happy path). This is pillar 2 (Harness) meeting
pillar 3 (BYO-AI) on top of pillar 1 (Crouton OS), inside the pillar-4 POC flow.

Full breakdown: epic [#703](https://github.com/FriendlyInternet/nuxt-crouton/issues/703) (8 sub-issues,
#704–#711).

## Open idea — unified domain (not yet tracked)

Today's deploy topology is **per-app, two registrable domains**: `<app>.friendlyinter.net` (prod) and
`<app>.pmcp.dev` (staging) — two *separate registrable* domains on purpose, for bulletproof
cookie/session isolation (#133).

The idea flips the axis to **per-tenant**: a user defines *their* domain once, and apps/POCs nest
underneath (`<app>.<their-domain>`, with maybe a `.box` subdomain for the sandbox tier). Nicer mental
model for the user — define once, everything derives.

The tension to resolve before building: putting prod and sandbox apps under *one* registrable domain
re-opens the cookie-sharing surface the two-domain split exists to close. Likely resolution: the
**launched tier** derives from the tenant's own domain (define once for the part that matters), while
the **POC/sandbox tier stays on a system-owned domain** — convenience for the user, isolation preserved
by the system. Not yet an epic; capture here until it's worth tracking.

## Competitive wedge (summary)

| | Generic AI builders | Crouton |
|---|---|---|
| Foundation | generic, ungoverned codebase | opinionated, secured OS (yours) |
| Process | a chat box + "regenerate" | issue-driven harness, chat *or* headless |
| Intelligence | their model, their runtime, their bill | bring your own AI |
| Output | their code, behind a runtime | **your code, completely** |
| Speed vs safety | production from keystroke one | free-to-fail POC tier + a deliberate promote gate |
