# three-demo

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

## Local dev

```bash
pnpm install
pnpm --filter three-demo dev      # http://localhost:3008  (→ /three)
pnpm --filter three-demo typecheck
```

`hub: { db: 'sqlite', kv: true }` → local SQLite + KV in dev; D1 + KV on
Cloudflare. No env vars required beyond `BETTER_AUTH_SECRET`.

## Deploy — Cloudflare **Workers** (static assets) — pilot for #109

> This app is the pilot for [#109](https://github.com/pmcp/nuxt-crouton/issues/109)
> (epic [#108](https://github.com/pmcp/nuxt-crouton/issues/108)): deploying via
> the **Workers** static-assets preset instead of Pages, so D1 + KV are
> **auto-provisioned** instead of created by hand. Other apps stay on Pages
> unless/until this proves clearly better.

Not deployed with `nuxthub deploy`. Build uses Nitro's `cloudflare_module`
preset → `.output/` (a Worker + `.output/public` static assets); Nitro writes
the deployable config to `.output/server/wrangler.json`, injecting `main` and
the `ASSETS` binding from this app's `wrangler.jsonc`.

The D1 + KV bindings in `wrangler.jsonc` are intentionally **id-less**:
[wrangler auto-provisioning](https://developers.cloudflare.com/changelog/post/2025-10-24-automatic-resource-provisioning/)
(4.45+) creates and links `three-demo-db` + the KV namespace on the first
`wrangler deploy`, and keeps them linked across deploys — no `/deploy` first-time
setup, no ids to paste.

```bash
# needs Cloudflare auth once: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (or `wrangler login`)
pnpm --filter three-demo cf:deploy          # build + wrangler deploy → *.workers.dev URL (auto-provisions D1+KV)
pnpm --filter three-demo db:migrate:prod    # apply D1 migrations remotely (see #13632 caveat)
pnpm --filter three-demo cf:staging         # deploy the isolated staging env
```

Local Worker run (no Cloudflare account needed — uses `workerd`/miniflare):

```bash
pnpm --filter three-demo build              # or: NITRO_PRESET=cloudflare_module nuxt build
npx wrangler --cwd apps/three-demo/.output dev
```

> **Open follow-ups (tracked on #108/#109):** remote D1 migrations against an
> auto-provisioned binding ([workers-sdk#13632](https://github.com/cloudflare/workers-sdk/issues/13632)),
> a CI deploy workflow for the Workers path (the existing
> `.github/workflows/deploy-three-demo.yml` still targets Pages), and confirming
> per-PR preview parity with Pages.
