# ticket-editor

A tiny Excalidraw editor that commits edits **straight back to the repo** — the mobile
round-trip for `ticket-diagram` diagrams with **zero third-party login** (the Worker authenticates
as the **Crouton GitHub App** and commits as `crouton[bot]`; your phone never authorizes anything).
On Save, Excalidraw exports the PNG in-browser, so the committed image is exactly what you edited
(WYSIWYG). Sub-issue #503 of epic #483; App auth is #530 of epic #519.

## Routes

- `GET /?slug=<slug>&branch=<branch>` — the editor (loads `writeups/diagrams/<slug>.excalidraw`).
- `POST /api/save` `{ slug, branch, scene, png }` — commits `<slug>.excalidraw` (+ `<slug>.png`) to `<branch>`.

## Deploy (Cloudflare Workers)

```bash
cd workers/ticket-editor
pnpm install
# Crouton GitHub App auth (epic #519) — see SECRETS.md. Needs the App registered + installed first.
# Convert GitHub's PKCS#1 key to PKCS#8 first (Workers WebCrypto won't accept PKCS#1):
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in app-private-key.pem -out app-private-key.pkcs8.pem
npx wrangler secret put GITHUB_APP_PRIVATE_KEY      # paste the PKCS#8 key
npx wrangler secret put GITHUB_APP_ID
npx wrangler secret put GITHUB_APP_INSTALLATION_ID
npx wrangler deploy                                 # → https://ticket-editor.<account>.workers.dev
```

Then open `https://ticket-editor.<account>.workers.dev/?slug=make-tickets-human-readable&branch=claude/excalidraw-ticket-diagrams`
on your phone → edit → **Save** → a commit lands on the branch. Link that URL from each diagram's
sticky comment as a one-tap **✏️ Edit**.

## Notes

- The editor loads Excalidraw from the esm.sh CDN (runtime web app — fine; unlike our build-time
  renders, which stay offline). The exact ESM/CSS pins may need a small tweak after first deploy.
- Auth: the Worker mints a short-lived (~1h) **installation token** per request from the Crouton
  GitHub App's private key (`@octokit/auth-app`) — no stored PAT. Only the private key is durable;
  keep it a Worker secret, never commit it. Rationale: `writeups/setup/secrets-and-tokens.md`.
