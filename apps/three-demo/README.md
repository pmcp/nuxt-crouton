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

## Deploy (Cloudflare Pages via Wrangler)

This app is **not** deployed with `nuxthub deploy`. It ships to Cloudflare Pages
the same way `apps/velo` / `apps/triage` do. First-time setup needs Cloudflare
credentials (`wrangler login` or `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN`):

1. Run the **`/deploy` skill** for first-time setup — it creates the Pages
   project, the D1 database (`three-demo-db` + `three-demo-staging-db`) and the
   KV namespace, sets the secrets, and writes the real ids into
   `wrangler.jsonc` (the `REPLACE_WITH_*` placeholders).
2. `pnpm --filter three-demo db:migrate:prod` to apply migrations remotely.
3. `pnpm --filter three-demo cf:deploy` → prints the `*.pages.dev` URL.

CI is wired in `.github/workflows/deploy-three-demo.yml` (push to `staging`,
path-filtered, plus manual `workflow_dispatch`); it runs remote D1 migrations,
builds with `NITRO_PRESET=cloudflare-pages`, strips the `env` block from the
redirected wrangler config (Wrangler 4.64+ workaround), and deploys `dist/`.
