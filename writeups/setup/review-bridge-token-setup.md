# GitHub Token Requirement — Crouton Preview-Review Bridge

> Brief for a credentials/secrets-consolidation agent. Describes the **one GitHub
> credential** needed by the preview-review feature, the minimal scope, where it's
> consumed, and why it's **interim**. Source feature: epic #488 / PR #499.

> ⚠️ **Read this first — this documents the path we are trying to AVOID.** Handing the
> anonymous preview its *own* GitHub credential (a shared PAT) is the **interim** option.
> The preferred design is **no service token at all**: the reviewer (or the consuming
> agent) — both of whom already have GitHub identities — posts the comment. Provision a PAT
> only as a short-lived stopgap, and expect to retire it (see *Intended end state* and
> *Future: teams*). For key-consolidation purposes: **do not adopt this as a durable,
> centrally-managed credential.**

## TL;DR

A deployed **staging** preview needs to post a `🎯 Preview feedback` comment onto
the GitHub PR under review. That requires a GitHub credential with permission to
**comment on pull requests** in `pmcp/nuxt-crouton`. Provision the **narrowest**
token possible, **staging only**, and treat it as **temporary** — the intended end
state is a GitHub App or reviewer-OAuth (no shared service token).

## What consumes it

- **Component:** `@fyit/crouton-devtools` → server route `POST /api/_review`
  (`packages/crouton-devtools/src/runtime/server/api/review.post.ts`).
- **Action performed:** `POST https://api.github.com/repos/{owner}/{repo}/issues/{pr}/comments`
  (a PR conversation comment).
- **Runtime:** Cloudflare Worker (Nuxt/Nitro). **Staging deploys only** — the whole
  feature is gated behind the build flag `NUXT_PUBLIC_CROUTON_REVIEW=true` and is
  entirely absent from production builds (no endpoint, no token use).

## Environment variables the app reads

Nuxt maps `NUXT_*` env vars onto `runtimeConfig` at runtime. Only the **token** is a secret.

| Env var | Secret? | Maps to | Example |
|---|---|---|---|
| `NUXT_CROUTON_REVIEW_GITHUB_TOKEN` | **YES — secret** | `runtimeConfig.croutonReview.githubToken` | `github_pat_…` |
| `NUXT_CROUTON_REVIEW_REPOSITORY` | no (plain config) | `runtimeConfig.croutonReview.repository` | `pmcp/nuxt-crouton` |
| `NUXT_CROUTON_REVIEW_PR` | no (plain config) | `runtimeConfig.croutonReview.pr` | `499` |

Store the token as a **Cloudflare Worker secret** (e.g.
`wrangler secret put NUXT_CROUTON_REVIEW_GITHUB_TOKEN --env staging`) or a CI secret
injected at deploy time. **Never** bake it into the bundle, expose it to the client,
or set it on a production Worker.

## Minimal token scope

**Preferred — GitHub fine-grained PAT**
- Repository access: **only** `pmcp/nuxt-crouton`.
- Repository permissions: **Pull requests → Read and write** (covers PR conversation
  comments). Add **Issues → Read and write** *only* if also commenting on plain issues.
- Expiration: short (30–90 days). It's interim.

**Fallback — classic PAT** (avoid if possible; coarse)
- Scope: `repo` (private repos) or `public_repo` (public repo only). Broader than needed.

**Identity:** the comment is attributed to whatever account owns the token. Prefer a
**dedicated bot/machine account** over a human's personal token — attributable, and it
doesn't impersonate a person's full access.

## Security constraints (non-negotiable)

- **Staging only.** Never attach this token to a production Worker.
- **The `/api/_review` endpoint is currently unauthenticated** — anyone who can reach
  the staging URL can trigger a comment. Keep staging behind login, or treat the token
  as low-trust and rotate aggressively.
- **Rotate on schedule**; revoke immediately if a staging preview is/was public.

## Intended end state (do NOT provision a permanent broad token)

This PAT is a **stopgap**. The architecturally-correct replacements (tracked as a
follow-up to PR #499):
1. **Post as the reviewer** via GitHub OAuth (device flow) — no shared service token at all.
2. **GitHub App** (Pull requests: write) → mints short-lived *installation* tokens from a
   private key; gate `/api/_review` behind app/user auth.

Provision the PAT as **temporary** and expect to retire it.

## Future: teams / multi-tenant (NOT NOW — design constraint only)

This flow may later be offered to **teams**: many teams, each reviewing their own app's
previews and posting feedback to their own destination (their repo / their PRs). A single
shared PAT **does not extend to that** — it can't represent N reviewers/teams, can't be
scoped per-team, and becomes one high-value secret spanning every tenant. The multi-tenant
requirement makes the *identity-you-already-have* model effectively mandatory:

- **OAuth (post as the reviewer)** — each team member posts as themselves; no shared secret.
- **GitHub App** — each team/org **installs** the app on their repo; the app mints
  per-installation, short-lived tokens. One app, N installations, zero shared PAT.

**Implication for key consolidation:** do **not** standardize on a single long-lived PAT as
the canonical credential for this feature — it is a dead end the moment teams arrive. Treat
any PAT provisioned now as throwaway / per-developer, and plan the durable credential as a
**GitHub App** (or OAuth client) registered once and installed/authorized per team. (Scope
of *this* doc is the single-repo interim only; the teams build is later.)

## Machine-readable summary

```yaml
credential:
  id: NUXT_CROUTON_REVIEW_GITHUB_TOKEN
  type: github_pat                 # interim; target = github_app | oauth_device_flow
  secret: true
  provider: github
  consumer: "@fyit/crouton-devtools POST /api/_review (Cloudflare Worker, staging only)"
  purpose: "post PR review-feedback comments"
  github:
    repo: pmcp/nuxt-crouton
    fine_grained_permissions:
      pull_requests: write
      # issues: write                # only if commenting on issues too
    classic_scope_fallback: repo     # or public_repo for public-only
    identity: dedicated_bot_account_preferred
  environments: [staging]
  forbidden_environments: [production]
  gated_by_build_flag: NUXT_PUBLIC_CROUTON_REVIEW=true
  companion_non_secret_vars:
    NUXT_CROUTON_REVIEW_REPOSITORY: pmcp/nuxt-crouton
    NUXT_CROUTON_REVIEW_PR: "<pr-number>"
  storage: cloudflare_worker_secret   # wrangler secret put ... --env staging
  rotation_days: 30-90
  status: interim_AVOID_prefer_reviewer_or_agent_identity
  do_not_centralize: true             # not a durable, centrally-managed credential
  future_multitenant:
    planned: true                     # teams may use this flow later (not now)
    single_shared_pat_scales: false
    durable_model: github_app_per_installation | oauth_per_reviewer
```
