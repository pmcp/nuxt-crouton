# ticket-editor — secrets to provision

Context: `workers/ticket-editor` is a Cloudflare Worker that serves a mobile Excalidraw editor and,
on Save, commits the edited diagram back to `pmcp/nuxt-crouton` via the GitHub Contents API. It
touches **two systems for two reasons**:

- **Cloudflare = deploy-time** — push the Worker's code.
- **GitHub = run-time** — the deployed Worker commits edits back on its own (so there's no login on
  the user's phone), authenticating as the **Crouton GitHub App** (epic #519).

## How auth works now (App, not PAT)

The Worker holds the App's **private key** and mints a short-lived (~1h) **installation token**
just-in-time per request with `@octokit/auth-app`, then uses that token for the commit. The token
expires on its own; the **one** durable secret is the private key (it never hits the API — it only
signs JWTs to mint tokens). Commits then show as **`crouton[bot]`**. See the canonical rationale in
`writeups/setup/secrets-and-tokens.md`.

> Requires the Crouton GitHub App to be registered + installed on `pmcp/nuxt-crouton` (epic #519,
> WS1 — a one-time human action). Until then there is nothing to smoke-test end to end.

## Secrets

| Name | System | Purpose | Minimal scope | Stored as | New? |
|---|---|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare | `wrangler` deploys the Worker | Account → **Workers Scripts: Edit** (no D1/KV/R2 — this worker has no bindings; no Zone perms for a `*.workers.dev` URL) | GitHub Actions repo secret (and/or local env) | **Existing** — app deploys already use it; covers this worker |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare | Which account to deploy into | identifier (not sensitive) | GitHub Actions repo secret / env | **Existing** |
| **`GITHUB_APP_PRIVATE_KEY`** | GitHub | Signs JWTs to mint the per-request installation token (the App acts on GitHub at runtime) | The Crouton App's PEM private key — **the one durable secret** | **Cloudflare Worker secret** | **App model** |
| **`GITHUB_APP_ID`** | GitHub | Which App is authenticating | the App's numeric id (not sensitive) | Cloudflare Worker secret (or a `var`) | **App model** |
| **`GITHUB_APP_INSTALLATION_ID`** | GitHub | Which installation (repo/org) to scope tokens to | the installation id on `pmcp/nuxt-crouton` (not sensitive) | Cloudflare Worker secret (or a `var`) | **App model** |

## Provisioning

After the App is registered + installed (epic #519 WS1), set the Worker secrets:

```bash
cd workers/ticket-editor

# ⚠️ Convert the key first. GitHub gives a PKCS#1 PEM (-----BEGIN RSA PRIVATE KEY-----),
# but the Workers WebCrypto path @octokit/auth-app uses only accepts PKCS#8
# (-----BEGIN PRIVATE KEY-----) and does NOT auto-convert. Convert once:
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
  -in app-private-key.pem -out app-private-key.pkcs8.pem

npx wrangler secret put GITHUB_APP_PRIVATE_KEY      # paste the PKCS#8 key (the .pkcs8.pem)
npx wrangler secret put GITHUB_APP_ID               # the App id
npx wrangler secret put GITHUB_APP_INSTALLATION_ID  # the installation id on pmcp/nuxt-crouton
```

`GITHUB_APP_ID` / `GITHUB_APP_INSTALLATION_ID` aren't sensitive — you may instead put them in
`wrangler.jsonc`'s `vars` and keep only `GITHUB_APP_PRIVATE_KEY` as a secret.

> **Why PKCS#8:** signing happens via `crypto.subtle` (WebCrypto) in the isolate, which can't
> import PKCS#1. A key that works locally under Node can still fail on the deployed Worker — always
> store the converted PKCS#8 key. (The lib only auto-fixes escaped `\n` → real newlines, nothing more.)

## Key distinctions (so nothing gets conflated)

- The App private key is **not** `CLOUDFLARE_API_TOKEN` and **not** GitHub Actions' built-in
  `GITHUB_TOKEN`. It's the Crouton App's own key, carried only by this Worker.
- The private key lives **encrypted in Cloudflare** (Worker secret) — never committed to the repo.
- We **dropped the old `GITHUB_TOKEN` PAT** — the installation token replaces it (short-lived,
  minted just-in-time, never stored).
- `CLOUDFLARE_API_TOKEN` only needs **Workers Scripts: Edit** for this worker (broader is fine but
  not required); no D1/KV/R2/Zone scopes.

## TL;DR

- **Reuse:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- **App auth:** one durable secret = `GITHUB_APP_PRIVATE_KEY` (Worker secret) + `GITHUB_APP_ID` +
  `GITHUB_APP_INSTALLATION_ID`. No PAT. Commits post as `crouton[bot]`.
