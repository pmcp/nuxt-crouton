# Schema review — Recursive nested layouts (WS2, the keystone)

> **Data-model sign-off** for [#871](https://github.com/FriendlyInternet/nuxt-crouton/issues/871) (WS2 of epic [#868](https://github.com/FriendlyInternet/nuxt-crouton/issues/868)). This is the **Schema sign-off gate (#314)**: agree on the persisted shape *before* any `crouton-layout` / `crouton-core` code lands. Leave inline comments on the rows below; code starts only on `lgtm`/`approve`.

## What this changes (one line)

Today a layout leaf hosts exactly **one block**. WS2 lets a pane be a **whole sub-layout** — so a *page* is a layout whose panes are *app-layouts*, recursively ("layouts in layouts"). This review proposes **how** that nesting is modelled in the persisted tree.

## The shape today (for contrast)

```ts
// packages/crouton-core/app/types/layout.ts
interface LayoutLeaf  { type:'leaf';  blockId:string; config?; defaultSize?; minSize? }
interface LayoutSplit { type:'split'; direction:'horizontal'|'vertical'; children:LayoutNode[]; defaultSize?; minSize? }
type      LayoutNode  = LayoutLeaf | LayoutSplit
interface LayoutTree  { renderer:'panes'; root:LayoutNode }
```

Persisted as JSON in `layout_configs.tree` (a JSON column — `Record<string, unknown>`). Validated by `sanitizeLayoutTree` (`layout-tree.ts`, `MAX_DEPTH = 12`), rendered recursively by `LayoutRenderer.vue`, edited via `layout-edit.ts` (`dropBlock`/`splitLeaf`/`removeNode`/`applySizes`/`setConfig`, addressed by `NodePath`).

## ✅ Recommended: a dedicated `nested` node (Option B)

Add a **third node variant** that embeds a whole sub-layout. `leaf` stays "exactly one block"; `split` stays "arrange siblings in *this* layout"; the new `nested` means "an **app** boundary that is itself a layout."

```ts
interface LayoutNested extends LayoutNodeBase {
  type: 'nested'
  layout: LayoutTree   // a full sub-layout (its own renderer +, later, its own breakpoints)
  label?: string       // the app's name, shown at the App zoom level (WS1)
}
type LayoutNode = LayoutLeaf | LayoutSplit | LayoutNested
```

### `LayoutNested` — field table

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | `'nested'` | ✅ | discriminator (joins `'leaf'` / `'split'`) |
| `layout` | `LayoutTree` | ✅ | the embedded sub-layout — an "app" that is itself a layout. A full `LayoutTree` (not a bare node) so a sub-layout can carry its own `renderer` (`panes` now; `canvas`/`spatial` later, #855) and its own breakpoint overrides (WS5, #874) |
| `label` | `string` | — | human name for the app, surfaced at the **App** zoom level (WS1, #870). Falls back to the sub-layout's primary block name when absent |
| `defaultSize` | `number` 0–100 | — | size within the parent split (inherited from `LayoutNodeBase`) |
| `minSize` | `number` 0–100 | — | min size within the parent split (inherited from `LayoutNodeBase`) |

**`LayoutLeaf` and `LayoutSplit` are unchanged.** Only the union widens and one node type is added.

### Why this shape (the App boundary has to be explicit)

The semantic-zoom ladder (epic #868) treats **App** as its own level — you zoom *into* "the bookings app" as a unit. A `nested` node **is** that boundary:
- it gives the **zoom shell (WS1)** a clear recursion target (zoom into *this* node → edit *this* sub-layout);
- it gives **responsiveness (WS5)** a clean owner for per-app breakpoints (a sub-layout owns its own responsive overrides);
- it composes with **#855** — a sub-layout's `renderer` can later be `canvas`/`spatial` independent of its parent.

Crucially, a `nested` node is **not** the same as a `split`: a split just arranges two panes *on the same page*; a `nested` node says "these panes are **one app**." Without the boundary there is no "app" to zoom into and nowhere to hang per-app breakpoints.

### What it costs (mechanical, testable)

One added `case` in each of: the sanitizer (`sanitizeNode`), the renderer (`LayoutRenderer.vue`), the edit transforms (`layout-edit.ts`), and the viability check (`layout-viability.ts`). Each recurses into `node.layout.root` exactly as the `split` case recurses into `children`.

## Decisions that need your sign-off

1. **`layout: LayoutTree` (full) vs `root: LayoutNode` (bare).** Recommend **full `LayoutTree`** — forward-compat with per-sub-layout `renderer` (#855) and breakpoints (WS5). Costs a redundant `renderer:'panes'` per nesting today. *(Alternative: store only `root` and synthesise the tree wrapper at read time — lighter JSON, but WS5/#855 then need a migration.)*
2. **Recursion depth.** A nested layout's depth must **add to** the parent's depth so the existing `MAX_DEPTH = 12` stack-guard stays honest end-to-end (today `sanitizeLayoutTree` resets depth to 0 at each root). Recommend: thread depth through the `nested` case rather than restarting it. Is 12 the right total budget across nesting, or should nesting have its own (smaller) cap, e.g. **3 app-levels** to match the zoom ladder Site→Page→App?
3. **Edit path space.** Recommend each layout edits in **its own `NodePath` space**, rooted at the active sub-layout the zoom shell has focused — you edit one layout at a time. *(Alternative: one global path that crosses `nested` boundaries — simpler addressing, but every edit transform must know about the boundary.)*
4. **No DB migration.** `layout_configs.tree` is already a JSON column, so the nested shape lives inside existing storage — **no table change**. Confirm we're happy keeping nesting inline (vs Option C below, references).

## Considered & rejected

- **Option A — overload the leaf** (`LayoutLeaf.blockId?` optional + add `LayoutLeaf.layout?`). This is the brief's literal wording ("a leaf can host a sub-layout"). → ❌ **rejected as the mechanism** (intent kept): makes `blockId` optional, so every consumer must branch "is this leaf a block or a layout?", and it blurs the leaf invariant. A dedicated node keeps `leaf` honest and gives the App boundary a name. *(If you prefer the literal reading, say so on this line and we'll go with A.)*
- **Option C — reference by id** (`nested` holds a `layoutRef` → another `layout_configs` row). → ❌ **deferred, not now**: enables *reusable* app-layouts and composes with the site flow (WS3), but adds resolution, a second fetch, and cycle detection. Revisit if/when app-layouts need to be shared across pages; inline embedding (B) is the simpler keystone and can gain refs later without breaking the inline form.
- **Re-use `split` as the boundary** (no new type; a "page" is just a deep split tree). → ❌ no way to express "these panes are one app" — kills the App zoom level and per-app breakpoints.

## 🧪 We'll be right if

A fixture page-layout whose panes are `nested` app-layouts (≥2 levels) renders correctly; a split/resize/remove edit *inside* a nested app-layout applies at that depth and leaves the outer layout untouched; viability is evaluated per nested container; and the whole tree round-trips through `sanitizeLayoutTree` + persistence with the depth cap enforced across nesting.

---
*Schema sign-off artifact for #871. Source: `writeups/schema-reviews/layout-nested.html`. Existing shape: `packages/crouton-core/app/types/layout.ts`.*
