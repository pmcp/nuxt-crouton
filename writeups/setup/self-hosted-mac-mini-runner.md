# Self-Hosted Mac mini GitHub Actions Runner — Runbook

**Date:** 2026-06-25
**Status:** Active setup runbook (epic #610 / #669 — WS1/WS2/WS5)
**Purpose:** Stand up the Mac mini at home as an **always-on GitHub Actions self-hosted
runner**, so the agent + deploy workflows run on our own hardware (no metered
GitHub-hosted minutes, full control) and survive reboots, sleep, and network blips.

> This is a different pattern from the Pi runbook
> (`writeups/setup/self-hosted-pi-agent-cloudflare-setup.md`). That one runs a **custom
> pi.dev HTTP worker** behind a Cloudflare Tunnel and dispatches to it directly. This one
> is a **stock GitHub Actions runner**: GitHub stays the orchestrator (issues = state,
> Actions = the runner host), and our existing workflows just `runs-on:` the Mac mini.
> No tunnel, no custom dispatcher, no open inbound ports — the runner makes an **outbound**
> long-poll to GitHub and pulls jobs.

## The shape of it

```
┌──────────────────┐   issue / comment / cron     ┌───────────────────────┐
│  GitHub          │  fires a workflow            │  GitHub Actions queue │
│  (issues =       │ ───────────────────────────▶ │  job tagged           │
│   state,         │                              │  runs-on: mac-mini    │
│   Actions =      │                              └──────────┬────────────┘
│   orchestrator)  │                                         │ outbound long-poll
└──────────────────┘                                         ▼  (no inbound ports)
                                              ┌───────────────────────────────┐
                                              │ Mac mini (at home)            │
                                              │  actions-runner/  (launchd)   │
                                              │   - label: mac-mini           │
                                              │   - Node 22 / pnpm / gh /     │
                                              │     wrangler toolchain        │
                                              │   - pnpm typecheck + full     │
                                              │     Nuxt builds  ✅           │
                                              │   no-sleep (pmset) + watchdog │
                                              └───────────────────────────────┘
```

## What the Mac mini can and cannot do (read first)

- **Can:** everything a GitHub-hosted `macos-latest` runner can, on our own always-on box —
  run agent jobs (`claude-code-action` / pi.dev), `gh` + `git`, `wrangler deploy`, **and
  crucially `pnpm typecheck` and full Nuxt builds.** Unlike the **Pi** (which *cannot* build
  — it's memory-constrained and offloads typecheck/build to CI; see the Pi runbook's "can/
  cannot" box), the Mac mini has the RAM to be the build box itself. This is the key
  difference: on the Pi you plan around no-builds; on the mini you don't.
- **Cannot / shouldn't:** safely run **untrusted fork PR code**. A self-hosted runner on a
  public repo executes whatever a `pull_request` from a fork contains, on *your* hardware,
  with your local creds in reach. Keep fork CI on GitHub-hosted; route only trusted
  (non-fork / known-actor) jobs to the mini. This is epic #610 WS4 — decide and document
  the policy; the workflows that target `mac-mini` should guard on actor/fork.

---

## 0. Prerequisites (on the Mac mini)

You're driving this from your own Mac over SSH into the mini — every step below is
copy-pasteable into that SSH session (or run directly if you're sitting at the mini).

```bash
# A working dir for the runner (NOT inside the repo — keep them separate).
mkdir -p ~/actions-runner && cd ~/actions-runner

# Confirm macOS arch (Apple Silicon = arm64; you'll pick the matching runner tarball).
uname -m            # arm64 (M-series) or x86_64 (Intel)
```

---

## 1. Register the runner + launchd service (#653)

### 1a. Get the registration token + download

In the GitHub UI: **Settings → Actions → Runners → New self-hosted runner → macOS**.
GitHub shows you the exact download URL + a **short-lived registration token**. Copy them
(the token expires in ~1h). The commands below mirror what that page generates.

```bash
cd ~/actions-runner
# Download the macOS arm64 runner (use the version/URL GitHub's page shows you):
curl -o actions-runner-osx-arm64.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.XXX.X/actions-runner-osx-arm64-2.XXX.X.tar.gz
tar xzf actions-runner-osx-arm64.tar.gz
```

### 1b. Configure with the `mac-mini` label

This is the load-bearing step: the routing toggle (#610 WS3, var `AGENT_RUNNER`) and the
reports-only pi.dev workflow (`a11y-daily-pidev.yml`) both target the **single custom
label `mac-mini`**. Label it exactly that.

```bash
./config.sh \
  --url https://github.com/FriendlyInternet/nuxt-crouton \
  --token <REGISTRATION_TOKEN_FROM_THE_UI> \
  --name mac-mini \
  --labels mac-mini \
  --work _work \
  --unattended \
  --replace
```

- `--labels mac-mini` — adds our custom label (GitHub auto-adds `self-hosted`, `macOS`,
  and the arch label `ARM64` on top; you don't list those).
- `--name mac-mini` — the runner's display name in the Runners list.
- `--replace` — if a stale `mac-mini` runner already exists, replace it cleanly.
- **Repo-scoped** here (simplest). Org-scoped is an open question in #610 (org lets other
  repos reuse the box later) — if you go org-scoped, register at the org's runner settings
  instead; nothing else in this runbook changes.

✅ **Checkpoint:** Settings → Actions → Runners shows a runner **`mac-mini`**, labels
`self-hosted, macOS, ARM64, mac-mini`, status **Idle**. *(This is #653 acceptance test 1.)*

### 1c. Install the launchd service (always-on across reboots)

Don't run `./run.sh` in a terminal — that dies on logout/reboot (explicitly the
**considered-and-rejected** `tmux`/login-shell path in #653). Use the runner's own launchd
installer:

```bash
./svc.sh install      # registers a GUI-domain launchd agent: actions.runner.<owner>-<repo>.mac-mini
./svc.sh start
./svc.sh status       # → "started" with a live PID
```

✅ **Checkpoint:** `./svc.sh status` shows the service started; the UI runner is **Idle**.

> The `./svc.sh install` agent already has launchd restart-on-crash behavior. The extra
> **KeepAlive + watchdog** in §4 covers the failures launchd can't see (wedged listener,
> lost GitHub connection).

---

## 2. Toolchain + secrets (#654)

### 2a. Toolchain on the box

GitHub-hosted runners ship a toolchain; a self-hosted one starts bare. The Mac mini needs
the full build toolchain (it *is* the build box now). Install once:

```bash
# Node 22 via nvm (matches the workflows' setup-node node-version: 22)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22 && nvm alias default 22

# pnpm via corepack (the repo's package manager)
corepack enable && corepack prepare pnpm@latest --activate

# GitHub CLI (agent jobs use `gh`)
brew install gh

# Wrangler (deploy jobs) — the repo pins it; a global is fine for ad-hoc use, but the
# deploy jobs run it via `pnpm`/`npx` from the repo, so this is mostly for manual checks.
brew install cloudflare-wrangler2 || npm i -g wrangler

# Sanity:
node -v   # v22.x
pnpm -v
gh --version
wrangler --version
```

> **`actions/setup-node` on self-hosted macOS:** the workflows use
> `actions/setup-node@v4` with `cache: pnpm`, which self-installs the requested Node
> per-job and manages its own cache under `_work/`. That works on self-hosted macOS —
> the nvm install above is for *interactive* shells and as a fallback; the per-job
> `setup-node` is what the jobs actually rely on. (#654 asks to confirm the macOS cache
> path works — it caches under the runner's `_work/_tool`, no extra config.)

### 2b. Secrets

**GitHub repo secrets are delivered to self-hosted runners exactly like hosted ones** —
they're injected into the job env at runtime; nothing is stored on the box. So the
secrets the agent/deploy jobs need require **no on-box action** beyond confirming they
resolve. The list (from #654):

| Secret | Used by |
|---|---|
| `ANTHROPIC_API_KEY` | the in-job agent (`claude-code-action`) |
| `PI_PROVIDER_KEY` | the pi.dev variant (`a11y-daily-pidev.yml`) — model-provider key |
| `CLOUDFLARE_ACCOUNT_ID` | `wrangler deploy` (Workers/D1/KV provisioning) |
| `CLOUDFLARE_API_TOKEN` | `wrangler deploy` (account Workers/D1/KV/R2 + zone routes/DNS) |
| `HARNESS_APP_ID` / `HARNESS_APP_PRIVATE_KEY` | `actions/create-github-app-token` — the App-token push path so pushes re-trigger CI |
| `PROJECTS_TOKEN` | cross-repo / project-board automation in the agent flows |

The **only** on-box secret in this whole runbook is the watchdog's optional `GH_TOKEN` /
`ALERT_WEBHOOK` (§4) — and those live in a gitignored `~/.runner-watchdog.env`, never in a
committed file.

> **macOS portability (#654 / #610 WS4 audit):** `actions/create-github-app-token` and
> `anthropics/claude-code-action@<pinned sha>` are Node actions → run fine on macOS
> self-hosted. The deploy workflows currently `runs-on: ubuntu-latest`; `wrangler deploy`
> itself is cross-platform Node, so it works from macOS — verify with the #654 test below
> before flipping any deploy job's `runs-on`.

✅ **Checkpoint (#654 acceptance):**
1. Route a cheap agent workflow to the runner (set repo var `AGENT_RUNNER=mac-mini`, run
   it) → it completes with **no missing-secret / missing-toolchain error**.
2. A `cf:staging` deploy dispatched to the runner provisions/deploys and the **preview URL
   responds**.

---

## 3. Route jobs to the runner (#610 WS3 — context)

The workflows that opt in already read a toggle: `runs-on: ${{ vars.AGENT_RUNNER ||
'ubuntu-latest' }}`. Setting the **repo variable** `AGENT_RUNNER=mac-mini` (Settings →
Secrets and variables → Actions → Variables) sends those jobs to the mini; unsetting it
falls back to GitHub-hosted. One variable, reversible — no workflow edits needed.

> This runbook covers WS1/WS2/WS5 (register + provision + keep-alive). Wiring *more*
> workflows to the toggle, and the fork-PR security policy (WS4), are tracked separately
> in #610 — don't broaden `runs-on` to untrusted-triggered workflows without that policy.

---

## 4. Keep it always-on: no-sleep + KeepAlive + watchdog (#657)

Three layers, set all three.

### 4a. No-sleep (`pmset`)

Full detail + the optional `caffeinate` launchd agent are in
[`scripts/mac-mini-runner/no-sleep.md`](../../scripts/mac-mini-runner/no-sleep.md). The
essentials, run on the mini:

```bash
sudo pmset -c sleep 0 disksleep 0 powernap 0 autorestart 1
pmset -g custom        # confirm: sleep 0 / disksleep 0 / autorestart 1 on AC
```

### 4b. launchd KeepAlive (process-level restart)

`./svc.sh install` already installs a launchd agent that restarts the runner if its
**process** dies. Confirm it's `KeepAlive`-d:

```bash
launchctl list | grep actions.runner          # shows the runner agent + its PID
```

If you want belt-and-suspenders, the runner's generated plist lives at
`~/Library/LaunchAgents/actions.runner.*.plist` — it ships with `KeepAlive` already; no
edit needed in the normal case.

### 4c. Watchdog (catches what KeepAlive can't)

KeepAlive restarts a *crashed* process. It does **not** catch a **wedged-but-alive
listener** or a **lost GitHub connection**. The watchdog does — it's the macOS twin of the
Pi runbook's "auth-retry-with-backoff self-heal" idea.

Two committed files do this:

- [`scripts/mac-mini-runner/runner-healthcheck.sh`](../../scripts/mac-mini-runner/runner-healthcheck.sh)
  — checks (1) the launchd service has a live PID, (2) that PID is a real
  `Runner.Listener`, (3) the box can reach `api.github.com`, (4) — if a `GH_TOKEN` is
  present — the repo's API reports ≥1 **online** runner. On any failure it restarts the
  runner via `launchctl kickstart` (falling back to `svc.sh`), alerts via an optional
  `ALERT_WEBHOOK`, and exits non-zero.
- [`scripts/mac-mini-runner/com.nuxtcrouton.runner-watchdog.plist`](../../scripts/mac-mini-runner/com.nuxtcrouton.runner-watchdog.plist)
  — a launchd agent that runs the health-check every **5 minutes**.

Install (edit the `<<EDIT>>` paths in the plist to your absolute home dir first):

```bash
# Optional: secrets for the API probe + alerts, in a gitignored env file the script sources.
cat > ~/.runner-watchdog.env <<'EOF'
GH_TOKEN=ghp_xxx          # a PAT with repo scope (only for the API liveness probe)
ALERT_WEBHOOK=https://hooks.slack.com/services/...   # optional Slack/Discord webhook
EOF
chmod 600 ~/.runner-watchdog.env

cp scripts/mac-mini-runner/com.nuxtcrouton.runner-watchdog.plist \
   ~/Library/LaunchAgents/com.nuxtcrouton.runner-watchdog.plist
# >>> edit the 4 YOURNAME paths in that copied plist <<<
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.nuxtcrouton.runner-watchdog.plist
launchctl kickstart  gui/$(id -u)/com.nuxtcrouton.runner-watchdog     # run it once now
tail -f ~/Library/Logs/runner-watchdog.log                            # watch it work
```

✅ **Checkpoint (#657 acceptance):**
1. **Force-reboot** the mini → runner returns to **Idle** within a couple minutes, no
   manual step (launchd brings the service back; pmset kept it from sleeping).
2. **Pull the network** briefly → the runner reconnects automatically when it's back
   (GitHub's runner has built-in reconnect; the watchdog's step 3 also catches a wedge).
3. **`kill` the runner process** → KeepAlive (or, within 5 min, the watchdog) restarts it.
   `kill $(pgrep -f Runner.Listener)` then watch `./svc.sh status` / the watchdog log.

---

## Three acceptance tests, in one place

Pulled from #653 / #654 / #657 so you can run them top-to-bottom once the box is set up:

1. **#653 — registered + always-on:** Runner shows **Idle** with label `mac-mini`; a
   trivial test job lands on it; after a **reboot** it returns to Idle automatically.
2. **#654 — secrets + toolchain:** A routed agent workflow completes with no
   missing-secret/toolchain error; a `cf:staging` deploy from the mini produces a
   responding preview URL.
3. **#657 — reliability:** Survives a force-reboot, a network drop, and a `kill` of the
   runner process — each time the loop recovers with no human nudge.

---

## See also

- The Pi pattern (custom worker + Cloudflare Tunnel, *cannot* build):
  `writeups/setup/self-hosted-pi-agent-cloudflare-setup.md`
- The reports-only pi.dev workflow that targets this runner: `.github/workflows/a11y-daily-pidev.yml`
- No-sleep detail + caffeinate agent: `scripts/mac-mini-runner/no-sleep.md`
- Epics: #610 (run the whole flow on the mini), #669 (pi.dev as the in-job agent)
