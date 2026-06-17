---
name: poc-deploy
description: Give a pocs/ app a Cloudflare Workers preview deploy so a PR returns a testable staging URL (auth-working). Use when wiring a POC for previews, or when "build X as a poc" needs to end at a clickable link. For launched apps/ apps use the /deploy skill instead.
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

# POC preview deploy

Makes the **endpoint of a POC a live, testable Cloudflare Workers preview URL** — the goal of epic #265. A POC lives in `pocs/<name>` (safe-to-break incubator; see root `CLAUDE.md`). This skill gives it a deploy workflow so **every PR that touches the POC deploys an isolated, auto-provisioned staging env and posts the preview URL on the PR**.

For **launched `apps/` apps** (production counterpart, two-domain deploy) use the **`/deploy`** skill instead — this one is the lighter, staging-only POC path.

## How it works

```
PR touches pocs/<name>/**  →  deploy-<name>.yml (caller)  →  deploy-app.yml (reusable, workspace: pocs)
   →  build (cloudflare_module) → wrangler deploy --env staging → auto-provision id-less D1/KV
   →  sync ids → remote D1 migrate → sticky PR comment: 🚀 <name> staging deployed: <url>
```

- The reusable `deploy-app.yml` takes a **`workspace`** input (`apps` default, or `pocs`) — that's the only thing that lets a `pocs/` app reuse the same pipeline as `apps/`.
- The preview is stable at **`https://<name>.pmcp.dev`** (the #133 staging domain), so `BETTER_AUTH_URL` is predictable and **auth works on the preview**.

## Wire a POC for previews

1. **Scaffold the POC first** (it must exist at `pocs/<name>` with a `wrangler.jsonc` that has an `env.staging` block: id-less `<name>-staging-db` + route `<name>.pmcp.dev`, and `cf:staging` in its `package.json` — the app scaffold produces these, mirroring `apps/velo`).
2. **Generate the deploy workflow:**
   ```bash
   pnpm poc:scaffold-deploy <name>      # → .github/workflows/deploy-<name>.yml
   ```
   It writes a thin caller of `deploy-app.yml` (`workspace: pocs`, `pull_request` + `workflow_dispatch`, `staging-url: https://<name>.pmcp.dev`, `secrets: inherit`).
3. **Open a PR.** CI deploys the staging Worker and posts the preview URL. First deploy auto-provisions the D1/KV (no manual resource creation).

## Auth on a fresh preview (so it's testable)

A freshly deployed Worker has no users. To make the preview testable *with auth*, the POC's **`seed` script provisions a known admin** against the remote D1 (run it post-deploy, or have CI do it), and the admin creds are handed back alongside the URL. (Self-registration on the preview also works if the POC enables it.) See the per-app `seed`/`shots` scripts.

## Requirements / gotchas

- **CI-only:** real Cloudflare deploys run in GitHub Actions — the `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` repo secrets must exist (same as the `apps/` deploys), and the token needs account Workers/D1/KV **and** zone Workers-Routes/DNS edit for the `<name>.pmcp.dev` custom domain. There are no CF creds in the dev sandbox; you cannot produce the URL locally — open the PR and let CI do it, then babysit to green.
- **Staging only.** No production block — pocs are previews. Promote `pocs/<name>` → `apps/<name>` and use `/deploy` for production.
- **Worker secrets** (e.g. `BETTER_AUTH_SECRET`) persist across deploys; set them once via `WORKER_SECRETS_JSON` (an Environment secret) or `wrangler secret bulk --env staging`.
- The workflow is **auto-generated** — re-run `pnpm poc:scaffold-deploy <name>` to update it rather than hand-editing.
