# CLAUDE.md - @fyit/crouton-layout

## Package Purpose

The **deterministic layout engine** for Nuxt Crouton, extracted from `crouton-core`
(epic #751, follow-up to #736/#709). It owns everything that arranges a team's
collections into a laid-out admin surface — the editor, the renderer, the
deterministic default-layout pass, the placeable blocks, and the `layout_configs`
storage.

It is **default-on**: `@fyit/crouton` (the meta-layer) extends this layer, exactly
the way `crouton-core` auto-includes `crouton-i18n` / `crouton-auth` / `crouton-admin`.
A fresh `crouton init` app gets the layout engine with zero extra wiring; an app can
opt out by disabling the module from a layer.

## Dependency direction (HARD RULE)

**One-way: `crouton-layout → crouton-core`.** This layer extends core and may import
from it; core must never depend on `crouton-layout`. Feature packages
(`crouton-bookings`, …) contribute their own blocks through the
`croutonLayoutBlocks` **app.config registry** (e.g. bookings registers
`bookings-calendar`). So:

- `crouton-layout` needs **no** knowledge of bookings/sales/etc.
- bookings/sales/etc. need **no** dependency on `crouton-layout`.

Never make a feature package depend on this one — wire blocks via the registry.

## Status (extraction in progress — #751)

This package is being populated workstream-by-workstream. The scaffold (#753) is the
empty layer; subsequent PRs move the code in:

| Workstream | Moves in |
|------------|----------|
| #753 scaffold ✅ | package.json · nuxt.config.ts · this CLAUDE.md · `pkg:crouton-layout` label · package-catalog entry |
| #757 default-on ✅ (pulled early) | `crouton.manifest.ts` (`bundled: true`) · `layout` feature flag in `CroutonOptions` · `@fyit/crouton-layout` added to every app/fixture/poc `extends` + deps. **Empty layer wired into the graph first** so the code-moves below stay clean one-way + green. The functional proof lands in #758. |
| #754 pure utils + types | `app/utils/layout-{compose,viability,tree,edit}.ts` + `app/types/layout{,-block}.ts` (+ tests); repoint the CLI import |
| #755 components + composables | `Layout` / `LayoutRenderer` / `LayoutEditorPane` / `LayoutCollection(+Data)` / `LayoutForm` / `LayoutSpikeStats`; `useCroutonLayout{Blocks,Edit,Store}`; the `croutonLayoutBlocks` defaults |
| #756 server side | `layout_configs` schema + `crouton-layouts/[layoutId].{get,put}` API + `/admin/[team]/layout` page (migration continuity) |
| #758 prove it | typecheck + e2e + docs; port the mobile slideover (#749) + loading-state UX fixes into the core page |

**Why #757 is first:** apps `extends: ['@fyit/crouton-core', …]` directly and core can't extend this layer (circular). So this layer only becomes active once it's in each app's `extends`. Wiring it (empty) up front means #754–#756 move code into an already-active layer — clean cross-layer auto-imports, no backward `core → layout` shims, one-way deps preserved at every PR.

## Key Files

_Populated as the extraction lands (#754+)._ Until then this layer is an empty
shell that extends `crouton-core`.

## Conventions

Defers to the **root `CLAUDE.md`** for all workflow/commit/issue conventions
(GitHub-issue tracking, `/commit`, no-squash merges, the `packages/` edit gate).
This file covers only what is specific to `crouton-layout`.
