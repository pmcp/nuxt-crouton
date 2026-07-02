# Bookings-from-blocks — gap report

**Epic:** [#924](https://github.com/FriendlyInternet/nuxt-crouton/issues/924) · **Date:** 2026-07-01 ·
**Host POC:** `pocs/booking-demo` · **Compose page:** `app/pages/admin/[team]/blocks.vue`

> The deliverable of the #924 gap test. We decomposed the bookings module's compound surface
> (`CroutonBookingsPanel`) into four **atomic layout blocks**, registered them in
> `croutonLayoutBlocks`, and rebuilt the native calendar-primary screen from those blocks alone.
> This catalogues **every place the block/layout system fell short** — the point of the exercise.

---

## 👤 For humans (what we learned)

**The good news:** a consumer of `@fyit/crouton-bookings` really can pull the module apart and
reassemble it from blocks. On desktop and tablet the composed screen shows the calendar, a filter
bar, a locations picker, and a live bookings list — and **picking a location in one pane filters
the list *and* the calendar in the other panes.** The pieces come apart and still talk to each other.

**The catch:** they only talk because we hand-built a **shared store** for them to talk *through* —
the layout tree itself carries no wire between panes. And three things the compound Panel does
(a real map, calendar↔list cross-highlighting, the "show map / show calendar" view switcher)
**don't survive being split into independent panes** — they only make sense inside one surface.
And the natural "calendar on the left, controls on the right" arrangement **breaks on a phone**:
it doesn't fold down to a single column the way it should, so the controls get squished off-screen.

So the honest verdict: **blocks reproduce the module's *pieces and their data*, but not its
*compound choreography* — and side-by-side arrangements aren't yet phone-safe without more work.**

### Side-by-side (evidence in `screenshots/`)

| Width | File | Result |
|---|---|---|
| Desktop 1440 | `blocks-desktop.png` / `blocks-desktop-filtered.png` | ✓ Full arrangement; location-filter drives list **and** calendar |
| Tablet 820 | `blocks-tablet.png` | ✓ Arrangement holds; all four blocks render + data flows |
| Phone 390 | `blocks-phone.png` | ✗ **No reflow** — panes squish below their minimums, controls rail clipped |
| Native ref | `native-bookings-desktop.png` | The compound Panel we were reproducing |

---

## 🤖 For agents (verified facts)

### What was verified WORKING

1. **Atomic blocks render standalone.** All four —
   `bookings-calendar-only` / `bookings-filters` / `bookings-locations` / `bookings-list` —
   resolve through the allowlisted registry and render in their own panes (desktop + tablet shots).
2. **Compose-from-data reproduces the arrangement.** A static `LayoutTree`
   (`horizontal[ calendar-only 62% | vertical( filters, locations, list ) 38% ]`) rendered via
   `<CroutonLayoutRenderer :node="tree.root" />` yields the calendar-primary layout — no bespoke
   Vue, just data.
3. **Cross-pane coordination works — through the shared store.** Selecting *Center Court* in the
   `bookings-locations` pane filtered the `bookings-list` pane to Center Court bookings **and** lit
   the matching indicator dots in the `bookings-calendar-only` pane (`blocks-desktop-filtered.png`).
   The wire is `useBookingsLayoutFilters` (a `useState` store), **not** the tree.
4. **Self-fetch de-dupes across panes.** Each block calls `useBookingsList({ scope })`; the shared
   `useFetch` cache key means three panes reading the same data issue one request, not three — the
   *read* side needs no prop-drilling. (A positive: only the *write/coordination* side is a gap.)

**Test rig:** `pnpm --filter booking-demo exec nuxt dev` (port 3000) → sign-up + org `test1` +
active-org via better-auth API → seeded 3 `bookings_locations` / 7 `bookings_bookings` / 1
`bookings_settings` straight into `.data/db/sqlite.db` (better-sqlite3) → headless chromium
(`/opt/pw-browsers/chromium-1194`) with the session cookie at 390 / 820 / 1440.

---

## The gaps

Severity: 🔴 blocks the goal · 🟡 real divergence, workable · 🔵 papercut.

### Gap 1 — 🟡 Cross-pane state can't live in the layout tree

**What.** The native Panel owns filter state (`statuses` / `locations` / `showCancelled`) and
prop-drills it to its Calendar / List / Map / Filters children. Split into separate panes, the
layout tree gives them **no channel** to share it — the tree describes *structure*, not
*pane↔pane coordination*.

**Shortfall.** A block layout that needs coordinated state forces a **one-off out-of-band wire**.
Here that's `packages/crouton-bookings/app/composables/useBookingsLayoutFilters.ts` — a `useState`
store the four blocks agree on by convention. It works (Gap-verified #3 above), but nothing in the
block contract *declares* or *enforces* that agreement: a second bookings block from elsewhere
wouldn't know the key. **The composer can arrange panes; it can't wire them.**

**Follow-up.** A first-class "shared channel" concept for blocks (a typed, declared store keyed off
the block family) so cross-pane state is part of the contract, not a private handshake.

### Gap 2 — 🟡 View-toggle emits assume a single owning surface

**What.** `CroutonBookingsPanelFilters` emits `show-calendar` / `show-map` / `show-locations` /
`go-to-today` / `calendar-view`. Inside the compound Panel these swap *what the one surface shows*.

**Shortfall.** Across independent panes there is **nothing to toggle** — the calendar, map, and
locations are always-present separate panes. In `bookings-filters` those emits are wired to **inert
local refs** so the control still renders, and the live render shows the dead affordances plainly:
the filter bar still offers **Map / Locations / Calendar / Cancelled** toggles
(`blocks-tablet.png`, top-right) that do nothing in a pane layout. **View-state that means "switch
this surface" has no meaning once the surfaces are peers.**

**Follow-up.** Either a block variant that hides surface-switch affordances when composed as panes,
or promote view-switching to a layout-level concept (a pane that *is* a tabset of blocks).

### Gap 3 — 🔴 Deep interaction orchestration doesn't survive splitting

**What.** The compound Panel owns a bundle of cross-surface choreography: calendar↔list
cross-highlight, hovered-booking, click-a-date-to-create, scroll-to-date, schedule-rule derivation,
and the map's `flyTo` / focus-on-location.

**Shortfall.** None of it is expressible in the tree, so it's **inert** when the surfaces are panes.
The most visible casualty: **`bookings-locations` is a selectable *list*, not the geo `PanelMap`.**
The native map's value *is* being wired to Panel's `flyTo`/focus orchestration + per-location
coordinates; a standalone map pane has neither, so the robust atomic equivalent is a list. The
"compound feel" (hover a booking → the calendar highlights its day; click a day → the list scrolls)
is a **Panel-level concern the tree cannot reconstruct.** The blocks each do their atomic job; the
*orchestration between them* is lost.

**Follow-up.** This is the deep one. Cross-pane *interaction intents* (focus, highlight, scroll-to)
need a channel like Gap 1's, but richer — an event bus blocks can publish/subscribe to by role.
Until then, a map-backed `bookings-locations` variant is blocked on cross-pane focus being
expressible.

### Gap 4 — 🔴 Side-by-side arrangements don't reflow to a stack at phone width *(new — from the live render)*

**What.** The natural way to author "calendar primary, controls beside it" is a **horizontal**
root split (`calendar | rail`). On a phone that must fold to a single vertical column. It didn't.

**Verified.** At a 390px viewport (renderer group measured **358px**), the root stayed a
**horizontal splitter** (`[data-panel]` present, no `[data-crouton-pane]`). Measured panes:

| Pane | Rendered width | Declared minimum | Honored? |
|---|---|---|---|
| `bookings-calendar-only` | **221px** | `minWidth: 460` | ✗ |
| controls rail (`filters`/`locations`/`list`) | **136px** | subtree min ≈ 300 | ✗ |

So **both** the min-width floor (#710) *and* the auto-stack (#852 follow-up) were inert: panes
squished to ~⅓ of their minimum, the calendar grid became unreadable, and the controls rail
collapsed to empty/placeholder states clipped at the screen edge (`blocks-phone.png`).

**Why (analysis).** The bare `CroutonLayoutRenderer` decides both behaviors from **its own group
width**, measured live via a `ResizeObserver` (`useElementSize`). When that read doesn't take
effect, `basisWidth` is 0 → every per-pane min-size (%) computes to 0 → reka lets panes shrink
freely → and `shouldStack` (which requires `basisWidth > 0`) never becomes true. The renderer *has*
a fallback for exactly this — an injected `LAYOUT_CONTAINER_WIDTH_KEY` — but **only
`CroutonLayoutResponsiveRenderer` provides it; the bare renderer does not.** The epic brief's
suggested compose pattern (`<CroutonLayoutRenderer :node="tree.root" />`) is therefore the
*un-responsive* path.

**Corroboration.** The deterministic composer's default tree (`crouton.layout.json`, rendered by
the `CroutonLayout` wrapper on `/admin/test1/layout`) uses a **vertical** root split — already a
column — so it's phone-safe *by construction* (measured 358px panes, full width) and never exercises
the horizontal auto-stack. And at tablet width (820px, comfortably above the panes' summed minimums)
the same horizontal compose renders correctly. So the failure is specific to
**horizontal-arrangement + narrow width + bare renderer.**

**Follow-up → tracked in [#1058](https://github.com/FriendlyInternet/nuxt-crouton/issues/1058).**
(a) The bare renderer should carry the same container-width fallback the responsive
renderer injects (or measure a guaranteed-non-zero ancestor), so `<CroutonLayoutRenderer>` is
responsive on its own. (b) The compose guidance should point at the responsive renderer for served
layouts. (c) A viability check at author time could warn when a horizontal split's summed min-widths
can't fit a phone breakpoint with no authored stack. Confirmed live on a real phone (booking-demo
staging).

### Gap 5 — 🟡 The block composition can't reproduce the Panel's single-surface feel or its chrome

**What.** The native bookings screen (`native-bookings-desktop.png`) is **one scrolling surface**:
calendar (primary) stacked above the list (secondary), a filter/view toolbar inline on top, plus
**Panel-level chrome** — "View as user" impersonation and a view switcher that swaps
calendar/map/locations *in place*.

**Shortfall.** The block layout reproduces the same *pieces* but as **independent resizable panes**,
not one primary/secondary surface with a toolbar. There's no block-level equivalent of the
impersonation / view-as-user chrome (it's Panel state, not a placeable surface), and the
"primary big / secondary small, stacked, one scroll" gestalt becomes "three peer panes you can
drag-resize." A reasonable trade — but a real divergence from the native experience to record, not
a pixel-match.

**Follow-up.** Some compound experiences want a **template block** (a single block that internally
lays out primary/secondary + toolbar and owns its chrome) rather than a tree of peers. Blocks vs.
template-blocks is a composition-model question the layout engine will keep hitting on rich modules.

---

## Bottom line

| | Reproduced from blocks? |
|---|---|
| The module's **pieces** (calendar / filters / locations / list) | ✅ Yes — all render standalone |
| Their **data** (shared fetch, live list) | ✅ Yes — self-fetch + shared cache |
| **Cross-pane filter coordination** | ⚠️ Yes, but only via a hand-built shared store (Gap 1) |
| **Cross-pane interaction choreography** (highlight, flyTo, scroll-sync, map) | ❌ No — Panel-owned, inert as panes (Gaps 2–3) |
| **Phone responsiveness** of a side-by-side arrangement | ❌ No — no reflow via the bare renderer (Gap 4) |
| The **single-surface feel + Panel chrome** | ❌ No — peers, not one surface (Gap 5) |

The layout/block system is strong at **structure + data**. Its next frontiers, surfaced concretely
by a real complex module, are **declared cross-pane channels** (state *and* interaction intents),
**responsive reflow from the bare renderer**, and a **template-block** composition model for
compound experiences.
