# Crouton GitHub App — registration & wiring runbook (epic #519)

> The one-time human setup (WS1) for the **Crouton GitHub App**: the Tier-2 / multi-tenant identity
> that replaces per-feature PATs. Rationale lives in [`secrets-and-tokens.md`](./secrets-and-tokens.md);
> this is the *do-it* checklist. After this, the ticket-editor Worker (#530) authenticates as the App
> and commits as `crouton[bot]` with no stored PAT.

## Decisions (recorded)

- **Owner = a GitHub organisation, not a personal account.** An org-owned App survives any one person
  leaving, allows multiple admins, and is the correct home for a product others install. GitHub has
  **no "transfer App ownership"** flow, so starting under the org avoids recreating the App (and
  re-wiring every secret) later.
- **Tenants do NOT need an org.** A GitHub App installs onto *any* account — personal or org. Owning
  the App in an org is purely our side (durability/branding); it imposes nothing on installers.
- **Visibility: private now → public at productization.** Register **"Only on this account"**? No —
  see the install-scope catch below. Because we dogfood on the **personal** `pmcp/nuxt-crouton` repo
  while the App is **org-owned**, the App must be **public ("Any account")** to install on it. That's
  fine: we're going public eventually, and during dogfood only we install it. (A public App can't be
  made private once *others* install it — irrelevant until real tenants exist.)
  - *Alternative (not chosen now):* move `nuxt-crouton` into the org, keep the App private. Cleaner
    long-term home but a disruptive repo move (redirects, CI/Cloudflare secrets) — defer as tidy-up.

## A. Create the org (if it doesn't exist)

GitHub → **+ (top-right) → New organization** → pick the **Free** plan → choose a handle
(`<ORG>` — e.g. `fyit` to match the existing `@fyit/*` npm scope, or `crouton`). One-time.

## B. Register the App

Navigate: `https://github.com/organizations/<ORG>/settings/apps` → **New GitHub App**.

Fill the form (verbatim field labels; required marked):

| Field | Value |
|---|---|
| **GitHub App name** *(req · global-unique · ≤~34 chars)* | `Crouton` (fallbacks: `Crouton App`, `Crouton CI`). Commits/comments will show as **`<slug>[bot]`**. |
| **Description** | optional — e.g. "Crouton runtime GitHub identity (diagram editor, review bridge, gates)." |
| **Homepage URL** *(req)* | `https://github.com/pmcp/nuxt-crouton` |
| **Identifying & authorizing users → Callback URL** | leave blank (no user-OAuth yet) |
| **Webhook → Active** | **UNCHECK** — no endpoint yet (turn on for WS5; one webhook per App, toggleable later) |
| Webhook URL / Webhook secret | leave blank (Active is off) |
| **Repository permissions** | **Contents → Read & write**, **Pull requests → Read & write**. *(Metadata auto-forces to Read-only — expected.)* |
| *(futureproof, optional)* | **Checks → Read & write** — WS4 needs it; setting now saves a re-approval later (cheap while you're the only installer). |
| **Subscribe to events** | none (Active is off) |
| **Where can this GitHub App be installed?** | **Any account** (public) — required so the org-owned App can install on the personal `pmcp/nuxt-crouton` repo. |

→ **Create GitHub App.**

> **Install-scope catch (why public):** a *private* App ("Only on this account") can only be installed
> on the account that **owns** it. Org-owned + private ⇒ installable only on the org's repos, **not** on
> personal `pmcp/nuxt-crouton`. Public sidesteps this.

## C. Generate & convert the private key

On the App's settings page → **Private keys → Generate a private key** (a PEM downloads; GitHub keeps
only the public half — store it safely, a lost key can't be re-downloaded, just generate a new one).

GitHub hands you **PKCS#1** (`-----BEGIN RSA PRIVATE KEY-----`). The Worker signs JWTs via **WebCrypto**
(`@octokit/auth-app` v7 → `universal-github-app-jwt` → `crypto.subtle`), which **only accepts PKCS#8**
and does **not** auto-convert. Convert once:

```bash
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
  -in crouton.<date>.private-key.pem -out crouton.pkcs8.pem
```

Also note the **App ID** (a number on the settings page — this is what the Worker uses; *not* the Client ID).

## D. Install it + get the installation ID

App settings → **Install App** → install on the account that has `nuxt-crouton` (the personal `pmcp`
account) → choose **Only select repositories → `nuxt-crouton`**.

Then open the installation's **Configure** page and copy the **installation ID** from the URL:
`.../settings/installations/<INSTALLATION_ID>`.

## E. Wire the Worker, deploy, verify

The #530 code already expects exactly these three secrets:

```bash
cd workers/ticket-editor
npx wrangler secret put GITHUB_APP_PRIVATE_KEY        # paste crouton.pkcs8.pem contents
npx wrangler secret put GITHUB_APP_ID                 # the App ID number
npx wrangler secret put GITHUB_APP_INSTALLATION_ID    # the installation ID
npx wrangler deploy
```

(`GITHUB_APP_ID` / `GITHUB_APP_INSTALLATION_ID` aren't sensitive — you may instead put them in
`wrangler.jsonc`'s `vars` and keep only `GITHUB_APP_PRIVATE_KEY` as a secret.)

**Verify (the epic's "we'll know by"):** open the editor on your phone → edit a diagram → **Save** →
the commit on the branch is authored by **`crouton[bot]`**, no PAT anywhere. That closes #530's smoke
test and proves WS3 (single-tenant key-in-Worker).

## Forward-compat (so this setup carries to the product)

- **Going public for real tenants (WS6):** already public — each external install is just another
  installation ID under this one App; mint a per-installation token. No re-registration.
- **Webhooks (WS5):** one webhook per App, can't be deleted but can be toggled. When the receiver Worker
  exists, set Webhook URL + a secret (GitHub HMAC-signs deliveries as `X-Hub-Signature-256`) and
  subscribe to events. This is also #515's "appoint the App to release" signal (assign / review-requested).
- **GitHub Checks (WS4):** if you didn't grant Checks at creation, adding it later requires every
  installer to re-approve (trivial while it's just you). The gates (artifact-gate / schema-review / UI
  sign-off / deploy) become Check Runs instead of bot comments.
- **review-bridge (other half of WS2):** the `/api/_review` endpoint (#491, in `packages/crouton-devtools`)
  swaps its PAT for an App installation token the same way — tracked separately (package HARD GATE).
- **Provenance:** once comments post as `crouton[bot]`, the `require-comment-provenance` hook band-aid
  (#497) can be retired for App-posted comments.

## Sources

GitHub Docs: [registering a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app) ·
[choosing permissions](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app) ·
[managing private keys](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps) ·
[installing your own app](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app) ·
[public vs private](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/making-a-github-app-public-or-private) ·
[modifying a registration](https://docs.github.com/en/apps/maintaining-github-apps/modifying-a-github-app-registration).
</content>
</invoke>
