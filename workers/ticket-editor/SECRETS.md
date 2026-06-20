# ticket-editor — secrets to provision

Context: `workers/ticket-editor` is a Cloudflare Worker that serves a mobile Excalidraw editor and,
on Save, commits the edited diagram back to `pmcp/nuxt-crouton` via the GitHub Contents API. It
touches **two systems for two reasons**:

- **Cloudflare = deploy-time** — push the Worker's code.
- **GitHub = run-time** — the deployed Worker commits edits back on its own (so there's no login on
  the user's phone), using its own GitHub token.

## Secrets

| Name | System | Purpose | Minimal scope | Stored as | New? |
|---|---|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare | `wrangler` deploys the Worker | Account → **Workers Scripts: Edit** (no D1/KV/R2 — this worker has no bindings; no Zone perms for a `*.workers.dev` URL) | GitHub Actions repo secret (and/or local env) | **Existing** — app deploys already use it; covers this worker |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare | Which account to deploy into | identifier (not sensitive) | GitHub Actions repo secret / env | **Existing** |
| **GitHub fine-grained PAT** | GitHub | The deployed Worker commits `<slug>.excalidraw` + `<slug>.png` back to the branch at runtime | Repo access: **`pmcp/nuxt-crouton` only** · Repository permissions → **Contents: Read and write** (Metadata: Read auto-included). Nothing else. | (a) **Cloudflare Worker secret** `GITHUB_TOKEN`; (b) optional GitHub Actions secret `TICKET_EDITOR_GH_TOKEN` (only if CI deploys) | **NEW — the only genuinely new ask** |

## The new PAT — details

- **Type:** GitHub fine-grained personal access token.
- **Resource owner / repo:** `pmcp/nuxt-crouton` only.
- **Permission:** Contents → **Read and write** (this is the entire blast radius if it leaks).
- **Expiry:** set one; note it for rotation.
- **Where it must end up:**
  - **Cloudflare Worker secret** named `GITHUB_TOKEN` (runtime). Set with:
    ```bash
    cd workers/ticket-editor
    npx wrangler secret put GITHUB_TOKEN   # paste the PAT
    ```
  - **(Only if deploying via CI)** also a **GitHub Actions repo secret** `TICKET_EDITOR_GH_TOKEN`
    holding the same PAT, so the deploy workflow can pipe it into the Worker secret.

## Key distinctions (so nothing gets conflated)

- The new PAT is **not** `CLOUDFLARE_API_TOKEN` and **not** GitHub Actions' built-in `GITHUB_TOKEN`.
  It's a standalone, narrowly-scoped GitHub token the Worker carries.
- The PAT lives **encrypted in Cloudflare** (Worker secret) — never committed to the repo.
- `CLOUDFLARE_API_TOKEN` only needs **Workers Scripts: Edit** for this worker (broader is fine but
  not required); no D1/KV/R2/Zone scopes.

## TL;DR

- **Reuse:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- **Create 1 new:** fine-grained GitHub PAT, `pmcp/nuxt-crouton` only, **Contents: Read/Write** →
  store as Cloudflare Worker secret `GITHUB_TOKEN` (+ optional Actions secret `TICKET_EDITOR_GH_TOKEN`).
