# crouton-builder-demo

A throwaway test app that proves the [`@fyit/crouton-three`](../../packages/crouton-three)
layer (TresJS / Three.js for Vue) works end-to-end in a real crouton app.

- **`/`** — landing page linking to the demo.
- **`/three`** — the demo:
  - `CroutonThreeStarterScene` — a **WASD / arrow-key** controllable cube
    (driven by `useThreeControls`).
  - `CroutonThreeModelViewer` — a **glTF model viewer** (orbit + auto-rotate),
    the same renderer the crouton-pages **3D Model** block uses. The sample
    model is served from `public/models/duck.glb` (Khronos “Duck” asset).

Extends `@fyit/crouton-core`, `@fyit/crouton-i18n`, `@fyit/crouton-three`, and
`@fyit/crouton-pages` (for the 3D Model block + generated `pages` collection).

## Crouton Builder spike — `/spike-app` (epic #907)

Build an app by composing a collection's blocks into a `LayoutTree` on a Vue Flow canvas.
Two levels on one screen: **Site** (the page flow — `CroutonFlowSiteFlow`, cards = pages) and
**Page** (the board — double-click a page card to compose its blocks; `Pages ←` returns).

> **Design decisions, gotchas & graduation requirements live in [`HANDOFF.md`](./HANDOFF.md)** — a
> living, curated handoff doc (the brief the `graduate` skill consumes). Keep it current as you build:
> capture each signed-off decision, prune what we iterate past.

**Quick verify** at a mobile viewport (390×844): enter a page → arrives fitted (no zoom-out wobble);
drop 2 blocks → double-click each → both framed fully on-screen; drag a card onto a layout + hold → it
goes green and the panes ease apart into a card-shaped slot → release to insert; pull a pane out → it
detaches where you release; add a block → lands right, centred, glowing green; pinch a layout → zooms.

## Local dev

```bash
pnpm install
pnpm --filter crouton-builder-demo dev      # http://localhost:3008  (→ /three)
pnpm --filter crouton-builder-demo typecheck
```

`hub: { db: 'sqlite', kv: true }` → local SQLite + KV in dev; D1 + KV on
Cloudflare. No env vars required beyond `BETTER_AUTH_SECRET`.

## Deploy — Cloudflare **Workers** (static assets) — pilot for #109

> This app is the pilot for [#109](https://github.com/FriendlyInternet/nuxt-crouton/issues/109)
> (epic [#108](https://github.com/FriendlyInternet/nuxt-crouton/issues/108)): deploying via
> the **Workers** static-assets preset instead of Pages, so D1 + KV are
> **auto-provisioned** instead of created by hand. Other apps stay on Pages
> unless/until this proves clearly better.

Not deployed with `nuxthub deploy`. Build uses Nitro's `cloudflare_module`
preset → `.output/` (a Worker + `.output/public` static assets); Nitro writes
the deployable config to `.output/server/wrangler.json`, injecting `main` and
the `ASSETS` binding from this app's `wrangler.jsonc`.

The D1 + KV bindings in `wrangler.jsonc` are intentionally **id-less**:
[wrangler auto-provisioning](https://developers.cloudflare.com/changelog/post/2025-10-24-automatic-resource-provisioning/)
(4.45+) creates and links `crouton-builder-demo-db` + the KV namespace on the first
`wrangler deploy`, and keeps them linked across deploys — no `/deploy` first-time
setup, no ids to paste.

```bash
# needs Cloudflare auth once: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (or `wrangler login`)
pnpm --filter crouton-builder-demo cf:deploy          # build + wrangler deploy → *.workers.dev URL (auto-provisions D1+KV)
pnpm --filter crouton-builder-demo db:migrate:prod    # apply D1 migrations remotely (see #13632 caveat)
pnpm --filter crouton-builder-demo cf:staging         # deploy the isolated staging env
```

Local Worker run (no Cloudflare account needed — uses `workerd`/miniflare):

```bash
pnpm --filter crouton-builder-demo build              # or: NITRO_PRESET=cloudflare_module nuxt build
npx wrangler --cwd apps/crouton-builder-demo/.output dev
```

> **Open follow-ups (tracked on #108/#109):** remote D1 migrations against an
> auto-provisioned binding ([workers-sdk#13632](https://github.com/cloudflare/workers-sdk/issues/13632)),
> a CI deploy workflow for the Workers path (the existing
> `.github/workflows/deploy-crouton-builder-demo.yml` still targets Pages), and confirming
> per-PR preview parity with Pages.
