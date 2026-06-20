# ticket-editor

A tiny Excalidraw editor that commits edits **straight back to the repo** — the mobile
round-trip for `ticket-diagram` diagrams with **zero third-party login** (the GitHub token is a
Worker secret; your phone never authorizes anything). On Save, Excalidraw exports the PNG
in-browser, so the committed image is exactly what you edited (WYSIWYG). Sub-issue #503 of epic #483.

## Routes

- `GET /?slug=<slug>&branch=<branch>` — the editor (loads `writeups/diagrams/<slug>.excalidraw`).
- `POST /api/save` `{ slug, branch, scene, png }` — commits `<slug>.excalidraw` (+ `<slug>.png`) to `<branch>`.

## Deploy (Cloudflare Workers)

```bash
cd workers/ticket-editor
pnpm install
npx wrangler secret put GITHUB_TOKEN     # fine-grained PAT, Contents: Read/Write on pmcp/nuxt-crouton
npx wrangler deploy                       # → https://ticket-editor.<account>.workers.dev
```

Then open `https://ticket-editor.<account>.workers.dev/?slug=make-tickets-human-readable&branch=claude/excalidraw-ticket-diagrams`
on your phone → edit → **Save** → a commit lands on the branch. Link that URL from each diagram's
sticky comment as a one-tap **✏️ Edit**.

## Notes

- The editor loads Excalidraw from the esm.sh CDN (runtime web app — fine; unlike our build-time
  renders, which stay offline). The exact ESM/CSS pins may need a small tweak after first deploy.
- Token scope: a **fine-grained PAT** limited to this repo's Contents is enough. Keep it a Worker
  secret — never commit it.
