# ticket-editor

A tiny Excalidraw editor that commits edits **straight back to the repo** — the mobile
round-trip for `ticket-diagram` diagrams with **zero third-party login** (your phone never
authorizes anything). On Save, Excalidraw exports the PNG in-browser, so the committed image is
exactly what you edited (WYSIWYG). Sub-issue #503 of epic #483.

Auth = the **Crouton GitHub App** (#519): the Worker mints a short-lived (~1h) installation token
just-in-time (WebCrypto, dependency-free) and commits as `nuxt-harness[bot]` — no stored PAT. See
`SECRETS.md` and `writeups/setup/secrets-and-tokens.md`.

## Routes

- `GET /?slug=<slug>&branch=<branch>` — the editor (loads `writeups/diagrams/<slug>.excalidraw`).
- `POST /api/save` `{ slug, branch, scene, png }` — commits `<slug>.excalidraw` (+ `<slug>.png`) to `<branch>`.

## Deploy (Cloudflare Workers)

```bash
cd workers/ticket-editor
pnpm install
npx wrangler secret put GITHUB_APP_PRIVATE_KEY   # the Crouton App's PEM private key (only secret)
# set GITHUB_APP_ID + GITHUB_APP_INSTALLATION_ID as wrangler vars (not sensitive)
npx wrangler deploy                              # → https://ticket-editor.<account>.workers.dev
```

Then open `https://ticket-editor.<account>.workers.dev/?slug=make-tickets-human-readable&branch=<branch>`
on your phone → edit → **Save** → a commit (authored by `nuxt-harness[bot]`) lands on the branch. Link
that URL from each diagram's sticky comment as a one-tap **✏️ Edit**.

## Notes

- Auth is the **Crouton GitHub App** (#519) — short-lived installation tokens minted at runtime
  directly with **WebCrypto** (dependency-free; sign an App JWT → exchange for an installation
  token); **no stored PAT**. The one durable secret is the App private key. Full model in
  `SECRETS.md` + `writeups/setup/secrets-and-tokens.md`.
- The editor loads React, ReactDOM and Excalidraw as **UMD `<script>` globals** from the unpkg CDN
  (Excalidraw's official no-build recipe). `window.EXCALIDRAW_ASSET_PATH` points at the same unpkg
  `dist/` so Excalidraw's lazy-loaded chunks + fonts resolve (pointing it at esm.sh 404s the chunks
  → `Excalidraw` is undefined → React #130 → blank canvas). `window.process.env.NODE_ENV` is shimmed
  before the scripts (the browser build reads it). Styles are injected by the UMD bundle — no
  separate CSS link. This is a runtime web app, so CDN loads are fine, unlike our build-time renders.
  We moved off the esm.sh ESM + `?external` import-map path because its dynamic
  `import('react-dom/client')` failed to fetch on both desktop and mobile (#563).
