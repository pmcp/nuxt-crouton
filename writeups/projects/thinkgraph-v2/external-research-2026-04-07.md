# ThinkGraph v2 — External Research & Build Proposals

**Date:** 2026-04-07
**Status:** Research only — **not yet committed to build**
**Author:** Conversation findings, audited
**Scope:** Six external projects evaluated against the v2 architecture, plus three workflow proposals (TDD-in-flow, 30% context handoff, conversation compaction) and one hardware decision (Mac Mini for local inference).

---

> ## ⚠️ Read this first
>
> **Nothing in this document is being built right now.** Every section below is research and proposals. The Anthropic auth situation in §1 is the only item with an *operational* component, and **we are deliberately not tackling it just yet** — the postmortem is here so we don't lose the analysis when we do come back to it. Treat this whole document as input for a future planning conversation, not as a build queue.
>
> If you read nothing else, read the TL;DR below and §1's banner.

---

## TL;DR

| # | Item | Verdict | Effort | Why |
|---|---|---|---|---|
| 1 | **Anthropic auth migration** | ⚠️ Required (eventually, not now) | ~30 min on the Pi | We are on subscription OAuth, which Anthropic banned Feb 20 / began enforcing Apr 4. Not blocked today but in the blast radius "in the coming weeks" (TechCrunch, Apr 4). |
| 2 | **TDD-in-flow with human approval gate** | ✅ Build it | ~1 day | Failing test = the contract. Catching a bad test takes 30s; catching wrong code at reviewer takes a full re-dispatch. |
| 3 | **30% context handoff rule** | ✅ Build it | 1-2 days | Long sessions degrade. Token tracking already exists at `session-manager.ts:400-410`. Pairs with #2 — same re-dispatch machinery. |
| 4 | **pi-vcc compaction adoption (vendored)** | ✅ Build it | 1-2 days | Solves v2 brief's "compressed conversation logs in `<details>` blocks" + the maxSteps exhaustion gotcha. The `session_before_compact` hook is real and present in our pinned `@mariozechner/pi-coding-agent` version. |
| 5 | **Local Gemma provider via `@fyit/crouton-ai`** | 🧪 Experiment | ~½ day | Cheap structured tasks (summary, classify, expand) move off Anthropic API. Pairs with #6. |
| 6 | **Mac Mini M4 Pro 48GB as inference host** | ✅ Adopt | Hardware purchase | Same architectural pattern as the Pi worker (home server behind a Cloudflare tunnel). Real money saved per month, not just a privacy/latency win. |
| 7 | **pi-vcc upstream as a dependency** | ❌ Skip | — | Vendor extraction core only. Don't take the dep on a small solo project. |
| 8 | **Loro CRDT migration** | ❌ Skip | — | Migration cost very high; nothing in v2 is blocked by Yjs. Steal one pattern (fractional-index movable trees) and stay on Yjs. |
| 9 | **pi-messenger** | ❌ Skip (reference only) | — | Filesystem-based, single-host. Doesn't solve our cross-tunnel dispatch problem. Borrow one primitive (file reservations) when Phase 1 multi-step parallelism lands. |
| 10 | **pi-claude-bridge "2 targeted steals"** | ❌ Drop | — | Bridge is built on the now-banned subscription OAuth pattern. Don't import patterns from a project that's about to break. Keep one idea (orphan-tool-result cleanup) but reimplement from scratch. |
| 11 | **Fine-tuning local LLM** | ⏸ Defer | — | Real but small fish. Capture as `/mcp-idea` for "fine-tune 3B for summary generation". Revisit when summary token cost becomes a budget item. |
| 12 | **discoveryMode/disable-memories tip** | ✅ Already aligned | One README line | Pi worker uses `PiSessionManager.inMemory()` and hardcoded tools. Document the alignment so it's not regressed. |

---

## §1 — Anthropic Auth Postmortem

> **🛑 NOT TACKLING THIS RIGHT NOW. This section exists to capture what we found before the context disappears. The remediation steps are written so they're ready to run when we choose to tackle it. Do not run them today without re-confirming the urgency and the steps below.**

### What happened

A subagent tasked with evaluating `pi-claude-bridge` confidently reported that we were "not in the blast radius" of Anthropic's Apr 4 enforcement against third-party harnesses using subscription OAuth. The user pushed back: "i thought we logged in with auth." That pushback was correct. The subagent was wrong on two independent counts.

### Mistake 1 — wrong machine

The subagent checked `~/.pi/agent/auth.json` on this Mac (it returned `{}`). But the Pi worker doesn't run on this Mac. It runs on the Pi 5 (`pi-api.pmcp.dev`). The Mac has no `apps/thinkgraph-worker/.env` file at all, confirming it never runs the worker locally. The state that mattered was on the Pi, and the subagent never touched it.

### Mistake 2 — misread the priority chain

The subagent assumed `ANTHROPIC_API_KEY` would dominate any OAuth state. The actual priority order in `@mariozechner/pi-coding-agent`'s `AuthStorage.getApiKey()` is documented in `apps/thinkgraph-worker/node_modules/@mariozechner/pi-coding-agent/dist/core/auth-storage.d.ts:115-122`:

```
Priority:
1. Runtime override (CLI --api-key)
2. API key from auth.json
3. OAuth token from auth.json (auto-refreshed with locking)
4. Environment variable
5. Fallback resolver (models.json custom providers)
```

OAuth (priority 3) **beats** the env var (priority 4). If `pi auth login` was ever run on the Pi, the OAuth tokens silently take precedence over `ANTHROPIC_API_KEY` even when both are present. The subagent's "we're on API key because the env var is set" reasoning was inverted.

### What the Pi actually had

When the user ran `cat ~/.pi/agent/auth.json` on the Pi:

```json
{
  "anthropic": {
    "type": "oauth",
    "refresh": "sk-ant-ort01-...",
    "access": "sk-ant-oat01-...",
    "expires": 1775577075105
  }
}
```

`type: "oauth"` confirms the worker authenticates via subscription OAuth — exactly the pattern Anthropic banned.

### The doc bug that caused this

`docs/projects/thinkgraph-v2/implementation-notes.md:110-114` says:

```markdown
**Requirements:**
- `ANTHROPIC_API_KEY` in `.env` file (systemd reads from there)
- `collabWorkerUrl` must stay in app's nuxt.config (broke production once, never remove)
- `pi auth login` required after Pi SDK updates
- nvm path must be in systemd service file
```

The doc literally instructs doing **both**: set the env var AND run `pi auth login`. Following the doc correctly produces the broken state, because step 3 (OAuth) wins over step 1 (env var) inside `AuthStorage.getApiKey`. This is **not user error**. It's a documentation bug.

Compounding it: the production env var table at `implementation-notes.md:128-138` lists `NUXT_ANTHROPIC_API_KEY` (for the Nuxt app) but not `ANTHROPIC_API_KEY` (for the worker). So the env-key path was easy to skip even after reading the docs.

### Anthropic's policy — what's actually enforced

Sources gathered by a follow-up subagent (verified with primary sources where available):

- **Feb 20, 2026:** Anthropic ToS updated to prohibit using Pro/Max **subscription OAuth tokens** in third-party harnesses.
- **Apr 4, 2026:** Enforcement begins against OpenClaw. TechCrunch coverage. Boris Cherny (Head of Claude Code) framed it as a prompt-cache/infra issue.
- **"Coming weeks":** Anthropic signaled the restriction will extend to all third-party harnesses, not just OpenClaw.
- **What's *not* banned:** API-key-based use of `@anthropic-ai/claude-agent-sdk` is fine. The ban targets the subscription OAuth pattern specifically.
- **What's ambiguous:** whether `@mariozechner/pi-coding-agent` itself qualifies as a "third-party harness" Anthropic will eventually go after even when it's used with API keys. There's no signal of this today.

### Cost implication

Currently we are paying $0 for the Pi worker's Claude inference because it runs against a Pro/Max subscription. After remediation, every dispatch hits the metered API. Rough estimates assuming the existing 4-stage pipeline (analyst → builder → reviewer → merger) on Sonnet:

- Per pipeline run: ~200k input + ~40k output tokens (conservative)
- Sonnet pricing: ~$3/M input, ~$15/M output
- Per run: ~$0.60 + $0.60 = **~$1.20/run** before caching
- 5 dispatches/day × 30 days ≈ **$180/month** (raw)
- 15 dispatches/day × 30 days ≈ **$540/month** (raw)
- With prompt caching (default in Sonnet 4 via `claude-agent-sdk`, forwarded by pi): 2-5× input reduction → **$80-300/month** realistic range

This is the most consequential cost change in the conversation, and it's the main reason §3 (Mac Mini for local inference) earns its keep — every cheap stage we route off Anthropic is real margin.

### Security: token exposure during the postmortem

The user pasted the actual `refresh` and `access` tokens into the chat to confirm the OAuth state. **These tokens must be rotated when we tackle the remediation.** The `refresh` token in particular can mint new access tokens; it should be considered compromised. Action when remediating: delete `~/.pi/agent/auth.json` AND log out from Claude on claude.ai → Settings → Sessions to revoke the refresh token server-side.

### Remediation steps (when we tackle this — not today)

When we choose to do this, the steps are:

**Step 1 — Stop the worker so it can't auto-refresh:**
```bash
sudo systemctl stop thinkgraph-worker
```

**Step 2 — Wipe local OAuth credentials:**
```bash
rm ~/.pi/agent/auth.json
echo '{}' > ~/.pi/agent/auth.json
```

**Step 3 — Revoke the refresh token server-side** (claude.ai → Settings → Sessions → revoke). This is not optional because the tokens were exposed in chat.

**Step 4 — Provision a paid API key** at console.anthropic.com → API Keys → Create Key. Set a monthly spend limit (e.g., $200) on the key while creating it so a runaway dispatch can't drain the account.

**Step 5 — Add the key to the worker's environment.** First find the systemd unit's EnvironmentFile:
```bash
sudo systemctl cat thinkgraph-worker | grep EnvironmentFile
```

Edit that file (likely `/home/pmcp/nuxt-crouton/apps/thinkgraph-worker/.env`):
```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Step 6 — Reload and restart:**
```bash
sudo systemctl daemon-reload
sudo systemctl start thinkgraph-worker
journalctl -u thinkgraph-worker -f
```

Dispatch a test work item from ThinkGraph and watch the logs. Look for normal session creation, no `401`/`403`/`unauthorized`.

**Step 7 — Verify the auth path:**
```bash
cat ~/.pi/agent/auth.json
# Expected: {}
```

With auth.json empty, `getApiKey()` falls through priorities 1-3 and lands on priority 4 (env var). That's the sanctioned path.

**Step 8 — Fix the doc bug** in `implementation-notes.md` (see §1.7 below).

### §1.7 — Doc fix to make later

When tackling the remediation, also patch `implementation-notes.md` so this doesn't happen again. Proposed diff:

```diff
 ### Pi Worker Setup

 Worker runs on Pi.dev machine, dispatched via `pi-api.pmcp.dev` Cloudflare tunnel.

 **Requirements:**
-- `ANTHROPIC_API_KEY` in `.env` file (systemd reads from there)
+- **`ANTHROPIC_API_KEY` in `.env` file (REQUIRED — paid API key from console.anthropic.com)**
+- **DO NOT run `pi auth login`.** The OAuth tokens it stores are (a) banned by Anthropic
+  ToS as of Feb 2026 for third-party harnesses, and (b) silently override the env var
+  because `AuthStorage.getApiKey()` priority is OAuth (3) > env var (4). Verify with
+  `cat ~/.pi/agent/auth.json` — should print `{}`.
 - `collabWorkerUrl` must stay in app's nuxt.config (broke production once, never remove)
-- `pi auth login` required after Pi SDK updates
 - nvm path must be in systemd service file
```

And in the env vars table at `implementation-notes.md:128-138`, add the missing row:

```diff
 | Variable | Required | Description |
 |----------|----------|-------------|
 | `BETTER_AUTH_SECRET` | Yes | Session encryption |
 | `BETTER_AUTH_URL` | Yes | Production URL |
 | `NUXT_ANTHROPIC_API_KEY` | Yes | AI features |
+| `ANTHROPIC_API_KEY` | Yes (worker) | Pi worker Claude inference. Paid API key. |
 | `WEBHOOK_SECRET` | Yes | Worker callback auth |
```

### §1.8 — Future-proofing: the LLMProvider seam (also not now)

Even after the API-key migration, there's residual risk that Anthropic could broaden enforcement to "any non-sanctioned harness regardless of auth method." The hedge is a thin abstraction:

**New file:** `apps/thinkgraph-worker/src/llm/pi-provider.ts`

Wraps the things `session-manager.ts` actually imports from `@mariozechner/pi-coding-agent`:
- `createAgentSession`
- `SessionManager` (as `PiSessionManager`)
- `AuthStorage`
- `ModelRegistry`

Exposes a small interface: `createSession({ cwd, tools }) → Session` where `Session` exposes only `prompt(text)`, `steer(text)`, `abort()`, `subscribe(cb)`, `tokenUsage`.

**Files touched** for the seam:
- `session-manager.ts:12-17` — replace direct pi imports with `import { createSession } from './llm/pi-provider'`
- `pi-extension.ts` — tool shape moves through the interface (TypeBox stays, but the consumption is through the seam)
- `index.ts` — wiring change only

**Files unaffected** (they don't import from pi):
- `pm-tools.ts` (uses TypeBox + ofetch)
- `yjs-client.ts` (Yjs only)
- `dispatch-watcher.ts` (HTTP only)

A future `claude-agent-sdk-provider.ts` becomes a drop-in replacement at the seam if needed. **Not needed today, but cheap insurance.**

---

## §2 — Build Proposals

### §2.1 — TDD-in-flow with human approval gate

**Status:** Proposal — not yet built. ~1 day if combined with §2.2 (they share infrastructure).

#### The case

The failing test is the *contract* for the implementation. If the test is wrong, the implementation will be confidently wrong, and we won't notice until reviewer stage burns a full re-dispatch. Catching a bad test at the moment it's written takes 30 seconds. This is the highest-leverage intervention point in the entire pipeline.

The user asked specifically whether this should have a human in the loop. Yes. The test is exactly the moment where misalignment is most cheaply reversible.

#### Where it lives

`apps/thinkgraph-worker/src/session-manager.ts:633-685` — `builderInstructions()`. Currently the builder steps are:

1. Step 1: Read project conventions (CLAUDE.md, skill files)
2. Step 2: Execute the work
3. Step 3: Screenshot
4. Step 4: Pre-commit checks (i18n, docs sync, commit format)
5. Step 5: Commit, push, create PR

We insert two new steps between Step 1 and Step 2: a TDD loop (Step 2A) and an approval checkpoint (Step 2B).

And in `apps/thinkgraph-worker/src/session-manager.ts:687-777` — `reviewerInstructions()`. We add one checklist item to the existing checklist.

#### Proposed builder change

After line 658 (end of "Step 1: Read Project Conventions"), insert:

```diff
 ### Step 2: Execute the Work

-Follow the brief. Use the conventions from the files you just read.
+### Step 2A: Write a Failing Test (TDD — MANDATORY for code changes)
+
+Before writing implementation, write a failing test that captures the contract from the brief:
+
+1. Identify the unit/feature under change
+2. Write a test in the appropriate test file:
+   - Unit: vitest in `apps/{app}/test/` or `packages/{pkg}/test/`
+   - E2E: playwright in `apps/{app}/tests/e2e/`
+3. Run the test — confirm RED (test exists, fails for the right reason — not a syntax error)
+4. Use `update_workitem` to set status='waiting', signal='orange', and append an artifact:
+
+```json
+{
+  "type": "test_approval",
+  "testFile": "apps/foo/test/auth.spec.ts",
+  "testCode": "<the full test you wrote>",
+  "expectedFailure": "<the failure message you saw — proves the test runs and fails right>",
+  "contractSummary": "<one sentence: what this test asserts the brief requires>"
+}
+```
+
+5. End your turn. Do NOT call `session.abort` — just stop. A human will review and approve via the canvas.
+
+**Skip TDD only when:**
+- Doc-only change (no `.ts`/`.vue`/`.css`/`.scss`/`.js`/`.mjs` files touched)
+- Config/wrangler tweak (`.toml`, `.yml`, `.json`)
+- Generated code (drizzle migrations, crouton scaffold output)
+- Explicit `autonomous: true` flag on the dispatch (escape hatch — see below)
+
+If you skip, document the reason in the work item output.
+
+### Step 2B: Wait for Approval (Resume from human input)
+
+When you're re-dispatched after a `test_approval` artifact, you will see a `## TEST APPROVAL` block in your prompt header containing the human's response:
+- **Approved as-is:** proceed to Step 2C with the test you wrote
+- **Approved with edits:** the human has updated the test in the artifact — read the edited version and proceed
+- **Rejected with note:** re-enter Step 2A using the human's correction
+
+### Step 2C: Make it GREEN
+
+Implement the minimum code to make the test pass. Refactor while staying GREEN. Commit tests and implementation in separate commits when feasible (`test(scope): add failing test for X` then `feat(scope): X`).
+
+### Step 2: Execute the Work
+
+Follow the brief. Use the conventions from the files you just read.
```

#### Proposed reviewer change

In `reviewerInstructions()`, the existing checklist runs at Step 5 (line 744-755). Add a TDD evidence item:

```diff
 ### Step 5: Run the Full Review Checklist

 ...

 Apply the checklist from `review/SKILL.md` to every changed file. Check boundary rules from `boundary-audit.md`. Categorize findings:
 - 🔴 **Critical** — security hole, data loss risk, crash
 - 🟡 **Warning** — bug likely, pattern violation, missing validation
 - 🔵 **Note** — minor issue, potential improvement

+### Step 5A: TDD Evidence Check
+
+Run:
+
+```bash
+git log main..HEAD --reverse --oneline
+git diff main..HEAD --stat
+```
+
+For any code change in the diff (`.ts`/`.vue`/`.css`/`.scss`/`.js`/`.mjs`):
+- [ ] **Test exists for the change.** A test file must be touched/created in the diff.
+- [ ] **Test commit predates impl commit.** The reverse log should show `test:` or `test(scope):` commits before `feat:`/`fix:` commits where feasible.
+- [ ] **If `autonomous: true` was used**, the diff must be small (≤50 LOC of code change) and the brief must reflect a low-risk change. Otherwise REVISE with "should have used the test_approval gate".
+
+If the change is doc-only, config, or generated, the TDD check is skipped — note that in your output.
```

#### The `autonomous: true` escape hatch

Don't add a `tdd: false` flag. That becomes a bypass everyone defaults to and the rule dies in a week.

Instead, dispatch can carry `autonomous: true` which means: TDD is still on, but the agent self-approves its own test (skips Step 2B). Reviewer enforces that the change was actually small enough to deserve self-approval. This forces an *explicit* opt-out per dispatch, not a global one.

#### Why this fits ThinkGraph specifically

- **Canvas-native review surface.** The test renders as a node artifact, the human sees it where they're already working.
- **Aligns with "AI as canvas participant"** vision (`MEMORY.md` → `project_ai_canvas_presence.md`) — the agent literally raises a hand mid-task.
- **Aligns with "intentional node creation"** principle — the human stays in the loop on what the system is committing to.
- **Composes with §2.2 (30% handoff)** — both are flavors of "agent pauses, writes structured state, waits". One re-dispatch path, two trigger conditions. Build them in the same PR.
- **Composes with node-level conversations vision** — the test becomes a message in the node thread, approval is the human's reply.

#### Concrete files touched

| File | Lines | Change |
|---|---|---|
| `apps/thinkgraph-worker/src/session-manager.ts` | 633-685 (builderInstructions) | Insert Step 2A/2B/2C |
| `apps/thinkgraph-worker/src/session-manager.ts` | 687-777 (reviewerInstructions) | Insert Step 5A TDD evidence check |
| `apps/thinkgraph-worker/src/dispatch-watcher.ts` | (TBD — find the watcher) | Detect `test_approval` artifact + `status='waiting'` and surface to canvas |
| `apps/thinkgraph/server/api/teams/[id]/thinkgraph-nodes/[nodeId]/...webhook` | (TBD — find webhook) | Re-dispatch on human approval, prepend approval block to next builder prompt |
| `apps/thinkgraph-worker/src/pm-tools.ts` | 99-103 (artifacts) | None — artifact array is open-typed |
| ThinkGraph canvas detail panel | (TBD — find component) | Render `test_approval` artifact with approve/edit/reject UI |

#### Cost

- ~½ day for the worker prompt edits
- ~½ day for the canvas approval UI (depends on existing artifact rendering)
- Shared cost with §2.2 for the re-dispatch infrastructure

---

### §2.2 — 30% Context Handoff Rule

**Status:** Proposal — not yet built. 1-2 days. Shares infrastructure with §2.1.

#### The case

Long sessions degrade. Pi sessions running a full analyst→builder→reviewer→merger pipeline accumulate context, and quality drops as the window fills. The user's cited approach (from the harness configuration tip): "I try to stay under 25-30% context window usage, and use the /handoff command when I'm approaching that limit." That's a humans-using-Claude pattern, not a worker pattern, but the principle transfers: cap context at 30%, write state to a handoff artifact, fresh agent picks up from the artifact.

Critically, **the infrastructure already exists**. We just don't act on it.

#### Token tracking is already in place

`apps/thinkgraph-worker/src/session-manager.ts:399-410`:

```typescript
case 'message_start': {
  if (event.message?.usage) {
    active.tokenUsage.inputTokens += event.message.usage.input_tokens || 0
  }
  break
}
case 'message_update': {
  if (event.message?.usage) {
    const usage = event.message.usage
    active.tokenUsage.inputTokens = Math.max(active.tokenUsage.inputTokens, usage.input_tokens || 0)
    active.tokenUsage.outputTokens = Math.max(active.tokenUsage.outputTokens, usage.output_tokens || 0)
  }
  // ...
}
```

`active.tokenUsage` is already on the `ActiveSession` interface (`session-manager.ts:69`). Every Claude message updates it. We have the number; we just don't compare it to anything.

#### Proposed monitor

In `handleSessionEvent` (`session-manager.ts:396`), after the existing token-usage updates at line 410, add:

```typescript
const ctxLimit = active.contextLimit ?? 200_000  // model-aware, set on session start
const used = active.tokenUsage.inputTokens
const ratio = used / ctxLimit
if (ratio >= 0.30 && !active.handoffTriggered) {
  active.handoffTriggered = true
  this.requestHandoff(nodeId, active, ratio)
}
```

`contextLimit` and `handoffTriggered` get added to the `ActiveSession` interface at `session-manager.ts:48-74`:

```typescript
interface ActiveSession {
  // ... existing fields ...
  /** Context window limit for the model — set on session start from ModelRegistry */
  contextLimit?: number
  /** True once we've requested a handoff — prevents re-firing */
  handoffTriggered?: boolean
}
```

`contextLimit` is set from the model registry when the session is created (`session-manager.ts:195-201`). Default to 200k (Sonnet 4 standard) for safety. The `claude-opus-4-6[1m]` variant has 1M, in which case 30% = 300k tokens — still a meaningful budget but proportionally larger headroom.

#### Proposed `requestHandoff` method

Don't `session.abort()` — that loses state. Use the existing `session.steer()` method (already used at `session-manager.ts:351`) to inject a system message:

```typescript
private requestHandoff(nodeId: string, active: ActiveSession, ratio: number): void {
  const msg = `\n\n--- SYSTEM: CONTEXT BUDGET REACHED ---
You have used ${Math.round(ratio * 100)}% of your context window (${active.tokenUsage.inputTokens} / ${active.contextLimit} tokens).

STOP your current work immediately. Do NOT continue the task — your context is degrading.

Use the \`update_workitem\` tool to write a handoff artifact:

{
  "artifacts": [...existing, {
    "type": "handoff",
    "state": "<one-paragraph summary of what you've accomplished so far>",
    "nextSteps": "<what the fresh agent should do next, in order>",
    "openFiles": ["<files you were editing>"],
    "branchState": "<output of git status / current branch / uncommitted changes>",
    "blockers": "<anything you got stuck on or were unsure about>",
    "timestamp": "${new Date().toISOString()}"
  }],
  "status": "waiting",
  "assignee": "pi",
  "output": "Context handoff at ${Math.round(ratio * 100)}% — see handoff artifact"
}

After calling update_workitem with the handoff artifact, end your turn. A fresh agent will be re-dispatched and will continue from where you left off.`

  active.session.steer(msg)
}
```

#### The receiving fresh agent

When a re-dispatch arrives for a node with a `handoff` artifact, `buildPMPrompt` (`session-manager.ts:499`) prepends a HANDOFF block to the prompt header. After the existing project context block (around line 506), inject:

```typescript
const handoff = this.findLatestHandoffArtifact(payload)
if (handoff) {
  header += `\n## HANDOFF FROM PREVIOUS SESSION\n
You are continuing work that a previous agent paused at ${handoff.timestamp} because they hit the 30% context threshold. Do NOT redo their work — read these notes carefully and continue from where they left off.

**State so far:**
${handoff.state}

**Next steps:**
${handoff.nextSteps}

**Files in flight:**
${handoff.openFiles.join('\n')}

**Branch state when handed off:**
${handoff.branchState}

**Blockers / unknowns:**
${handoff.blockers}

Verify the branch state with \`git status\` before continuing — the worktree may have changed.\n`
}
```

`findLatestHandoffArtifact(payload)` is a new helper that reads the work item via the existing GET path and returns the most recent artifact with `type: 'handoff'`.

#### Re-dispatch trigger

The webhook on the ThinkGraph side detects:
- `status === 'waiting'`
- `assignee === 'pi'`
- artifacts contains a `handoff` type with timestamp newer than the last dispatch

…and re-dispatches the same nodeId. This is the same webhook path as the test_approval gate from §2.1 — they share machinery.

#### Threading: handoff artifacts as conversation entries

Per `MEMORY.md` → `project_node_conversations.md`, each node is getting its own chat thread. **Make handoff artifacts first-class entries in that thread, not a separate artifact type.** A handoff = a message from the previous agent saying "here's where I left off, your turn." The receiving agent reads the conversation log + the latest handoff artifact, which is conceptually the same as `/clear` + fresh-thread + primer message.

This means one mental model for both humans and agents: "the node has a conversation, every participant (human, agent, fresh agent after handoff) writes messages to it." The 30% handoff is just a particular kind of message with a particular trigger.

#### Configurability

Make the threshold config-driven via `WorkerConfig` so it can be tuned without rebuilds:

```typescript
// apps/thinkgraph-worker/src/config.ts
export interface WorkerConfig {
  // ... existing ...
  handoffThreshold: number  // 0.0-1.0, default 0.30
}
```

The user's quoted source uses 25-30% for Claude Code because Claude Code's `/handoff` compaction loses fidelity above that. For Pi worker (no compaction), there's more headroom — but cleaner handoffs are better. Start at 30%.

#### Token count vs message count

Use **input tokens** (already tracked, accurate, model-aware). Message count is a proxy that breaks for long tool outputs — a single huge `git diff` can blow up one message past 50k tokens.

#### Concrete files touched

| File | Lines | Change |
|---|---|---|
| `apps/thinkgraph-worker/src/session-manager.ts` | 48-74 (ActiveSession interface) | Add `contextLimit`, `handoffTriggered` |
| `apps/thinkgraph-worker/src/session-manager.ts` | 195-201 (createAgentSession call) | Set `contextLimit` from model registry |
| `apps/thinkgraph-worker/src/session-manager.ts` | 410 (after token tracking) | Add monitor block |
| `apps/thinkgraph-worker/src/session-manager.ts` | new method | `requestHandoff` |
| `apps/thinkgraph-worker/src/session-manager.ts` | new method | `findLatestHandoffArtifact` |
| `apps/thinkgraph-worker/src/session-manager.ts` | 499 (buildPMPrompt) | Inject HANDOFF block |
| `apps/thinkgraph-worker/src/config.ts` | (WorkerConfig) | Add `handoffThreshold` |
| `apps/thinkgraph-worker/src/pm-tools.ts` | 99-103 (artifacts) | None — artifact array is open-typed |
| `apps/thinkgraph/server/api/.../webhook` | (TBD) | Detect handoff + re-dispatch |

#### Cost

- ~1 day for worker side
- ~½ day for webhook re-dispatch (shared with §2.1)

---

### §2.3 — pi-vcc Compaction (Vendored Extraction Core)

**Status:** Proposal — not yet built. 1-2 days. Independent of §2.1 and §2.2 but slots into the same `session-manager.ts`.

#### What pi-vcc is

`@sting8k/pi-vcc` — TypeScript extension for the Pi coding agent that compacts long conversation history *algorithmically* (regex/extraction, no LLM calls) into 4 semantic sections plus a brief transcript. Registers as a `session_before_compact` hook on the same `@mariozechner/pi-coding-agent` runtime our worker already uses. Real numbers from the project: 99%+ reduction, 2-64ms per compact. Reference: search npm for "@sting8k/pi-vcc" and the project README.

#### Why it's relevant — three concrete connection points

**1. The Pi runtime is the same.** Our worker already uses `@mariozechner/pi-coding-agent` (`session-manager.ts:13-17`). pi-vcc registers as a `session_before_compact` hook in that runtime. Drop-in compatible without architectural change.

**Verified:** the `session_before_compact` event is real. From `apps/thinkgraph-worker/node_modules/@mariozechner/pi-coding-agent/dist/core/extensions/types.d.ts`:

```
313: export interface SessionBeforeCompactEvent {
314:     type: "session_before_compact";
...
358: export type SessionEvent = ... | SessionBeforeCompactEvent | ...
...
634: export interface SessionBeforeCompactResult {
...
674:     on(event: "session_before_compact", handler: ExtensionHandler<SessionBeforeCompactEvent, SessionBeforeCompactResult>): void;
```

So this isn't speculation — the hook exists in our pinned version. We can register a custom compact handler.

**2. v2 brief explicitly calls for compressed conversation logs.** `brief.md:198-205`:

```markdown
<details>
<summary>Conversation log</summary>
Agent evaluated brief against existing codebase...
</details>
```

The v2 brief commits to writing each node as a markdown file with `<details>` blocks containing compressed conversation logs. **pi-vcc's 4-section format is exactly the missing compression step for those `<details>` blocks.** Without something like pi-vcc, the markdown layer either explodes in size or gets generic LLM summaries that cost real money per compact.

**3. Implementation notes already flag the pain.** `implementation-notes.md:71-75`:

```markdown
### Assistant maxSteps Exhaustion

`maxSteps: 15` gets exhausted when the assistant creates + dispatches many items.
Accumulated tool results eat context.

**Needed:** streaming tool results, or summarize-and-continue pattern.
```

pi-vcc's tool-call collapse — replacing verbose tool results with one-liners and `(#12)` references back to the raw history — addresses this directly. It also addresses the `retrospectiveFooter` "kitchen sink" complaint at `implementation-notes.md:53` by giving step-typed sections to merge into.

#### What we steal — the 4-section schema

pi-vcc compacts conversation into exactly four sections:

| Section | Sticky? | Source |
|---|---|---|
| **Session Goal** | Sticky | First user message + any explicit goal updates |
| **Files And Changes** | Union | Every file the agent has touched, deduplicated |
| **Outstanding Context** | Volatile | Open questions, blockers, undecided choices |
| **Transcript** | Rolling ~120 lines | Most recent N turns, tool calls collapsed to `(#N)` refs |

Plus a **User Preferences** section pi-vcc extracts heuristically. **Skip this section** — it's English-only regex extraction and noisy. Our nodes have explicit `assignee`/`provider`/`skill` fields that capture intent without guessing.

#### Sticky vs volatile merge

The merge strategy is the second thing we steal. Across multi-step pipelines (analyst → builder → reviewer → merger), each stage compacts independently, but:

- **Goal stays sticky** — every stage starts with the same Session Goal block
- **Files And Changes is union** — each stage adds, none subtract
- **Outstanding Context is volatile** — only the latest stage's open questions
- **Transcript is rolling** — only the latest stage's recent turns

This is exactly the right model for our pipeline because the analyst's open questions are not the builder's open questions, but the goal and the files-touched are continuous.

#### Tool call collapse + rolling transcript

pi-vcc replaces full tool call/result pairs in the transcript with `(#12)` references. A ~5,000-token tool result becomes a 4-character ref. The full content is still readable via the raw JSONL session log (pi-vcc exposes a `vcc_recall` tool for this).

For our worker, this maps directly onto the v2 brief's "Layer 3: Full" context layer (`brief.md:148`): the markdown file contains compressed sections + refs, the raw JSONL on disk contains everything.

#### What we don't steal

- **The `~/.pi/agent/` config flow.** pi-vcc has a debug mode that writes to `/tmp/pi-vcc-debug.json` and reads global config. We're a server worker, not an interactive Pi user.
- **The User Preferences section** (English regex, redundant with our schema)
- **`@sting8k/pi-vcc` as a dependency.** It's a small solo project. Vendor the extraction module into our own `apps/thinkgraph-worker/src/compact/` directory. Keep the dep surface tight.

#### Concrete plan

**New directory:** `apps/thinkgraph-worker/src/compact/`

**Files:**
- `compact/extract.ts` — the 4-section extractor (vendored from pi-vcc, stripped of User Preferences)
- `compact/merge.ts` — the sticky/volatile/union/rolling merge strategy
- `compact/markdown.ts` — emit the compacted state as markdown matching `brief.md:182-208`'s format
- `compact/index.ts` — export a single `compactSession(events) → CompactedState` function

**Hook registration** in `apps/thinkgraph-worker/src/session-manager.ts:195-210`:

```typescript
const { session } = await createAgentSession({
  cwd: this.config.workDir,
  sessionManager: PiSessionManager.inMemory(),
  authStorage,
  modelRegistry,
  customTools: tools,
})

// NEW: register compact handler
session.on('session_before_compact', async (event) => {
  const compacted = compactSession(event.history)
  return {
    keepSystem: true,
    replaceWith: renderAsMarkdown(compacted),
  }
})
```

(Exact handler shape per `extensions/types.d.ts:634` `SessionBeforeCompactResult` — confirm signature when implementing.)

**Markdown output** writes into the node's `<details>` block per the v2 brief format. When the node is finalized (merger stage), the worker commits the markdown file to `.thinkgraph/nodes/` in the repo.

#### Concrete files touched

| File | Lines | Change |
|---|---|---|
| `apps/thinkgraph-worker/src/compact/extract.ts` | new | Vendored extractor |
| `apps/thinkgraph-worker/src/compact/merge.ts` | new | Sticky/volatile merge strategy |
| `apps/thinkgraph-worker/src/compact/markdown.ts` | new | v2 brief format renderer |
| `apps/thinkgraph-worker/src/compact/index.ts` | new | Public API |
| `apps/thinkgraph-worker/src/session-manager.ts` | 195-210 | Register `session_before_compact` handler |
| `apps/thinkgraph-worker/src/session-manager.ts` | 455-460 | Existing `auto_compaction_start` event handler — keep, but emit a Yjs status that includes "using vcc compaction" for visibility |

#### Cost

- 1 day to vendor and adapt the extraction core
- ~½ day to wire the hook and write the markdown renderer

---

### §2.4 — Local Gemma Provider via `@fyit/crouton-ai`

**Status:** Proposal — not yet built. ~½ day. Pairs with §3 (Mac Mini hardware).

#### The case

After §1's auth migration, every Anthropic call is metered. Many of our AI tasks are *cheap* (classify, summarize, decompose, simple expand) and don't need Sonnet/Opus quality. Routing those to a free local model = real margin.

**Verified facts** (sources at the end of this section):
- Google Gemma 4 26B-A4B is real. Released, day-0 LM Studio support. The "A4B" means 4B active parameters (MoE).
- The article cited by the original subagent (George Liu, Apr 4 2026) is real and reproducible: 51 tok/s on M4 Pro / 48GB unified memory, 1.55s TTFT.
- LM Studio 0.4.0 has the `lms` headless CLI and exposes an OpenAI-compatible endpoint at `http://localhost:1234/v1`.
- Gemma 4 26B-A4B has a 256K context window and supports function/tool calling.

#### Where it fits

`@fyit/crouton-ai` already has a `createAIProvider(event)` factory used across all 15+ ThinkGraph in-app AI endpoints:

| Endpoint | What it does | Local-Gemma fit |
|---|---|---|
| `apps/thinkgraph/server/api/teams/[id]/thinkgraph-nodes/chat.post.ts` | Per-node Ask AI chat with progressive context | ✅ Strong — single-shot, streaming |
| `.../expand-with-context.post.ts` | Diverge / deep_dive / prototype / converge / validate (2-5 child nodes) | ✅ Strong — small JSON output |
| `.../synthesize.post.ts` | Combine connected nodes into a brief | ✅ Strong |
| `.../digest.post.ts` | Summarize a subtree | ✅ Strong |
| `.../brief.post.ts` | Convert raw input to a brief | ✅ Strong |
| `.../[nodeId]/expand.post.ts` | Per-node expand | ✅ Strong |
| `.../[nodeId]/classify.post.ts` | Tag/categorize a node | ✅ Strong |
| `.../project-assistant.post.ts` | Compress raw input into nodes | ✅ Strong |
| **v2 auto-summary generation** (the ~50-token index summary per node, `brief.md:32`) | Constant background generation | ✅ **Best fit** — high volume, latency-tolerant |
| Pi worker analyst/builder/reviewer/merger | Multi-step reasoning with tools | ❌ **Skip** — needs Sonnet/Opus, Liu's article reports Claude Code feels degraded |

#### Integration plan

`@fyit/crouton-ai`'s `createAIProvider` already supports OpenAI-compatible endpoints (it uses the Vercel AI SDK under the hood). Adding a local provider is just a config option.

**Step 1 — Add the provider** to `packages/crouton-ai/src/providers/` (or wherever the existing providers live):

```typescript
// New: localGemmaProvider.ts
import { createOpenAI } from '@ai-sdk/openai'

export function createLocalGemmaProvider(baseURL: string) {
  return createOpenAI({
    baseURL,
    apiKey: 'local',  // ignored by LM Studio
    name: 'local-gemma',
  })
}
```

**Step 2 — Wire it into `createAIProvider`** so it returns the local provider when an env var is set:

```typescript
const localUrl = process.env.THINKGRAPH_LOCAL_MODEL_URL
if (localUrl) {
  return createLocalGemmaProvider(localUrl)
}
// existing providers fallthrough...
```

**Step 3 — Add the env var** to `apps/thinkgraph/.env`:

```
THINKGRAPH_LOCAL_MODEL_URL=http://mac-mini.local:1234/v1
```

**Step 4 — Per-node provider override.** v2 brief's `provider` field on nodes (`brief.md:36`) lists `claude-code`, `codex`, `flux`, `openai`, `anthropic`. Add `local-gemma` as an option. Routes the node's AI calls to local instead of Anthropic when set.

**Step 5 — Fallback on connection error.** If the local endpoint is down (Mac Mini reboot, network issue), fall back to cloud Anthropic. 2-second timeout + try/catch + log a warning. Don't silently degrade — surface to the user that local is offline.

#### Zero changes to the 15 endpoints

Because the routing happens inside `createAIProvider`, none of the endpoint files change. You set the env var and per-node provider field, and the existing code paths route accordingly.

#### What about the worker?

The Pi worker's analyst/builder/reviewer/merger pipeline should **not** route through local Gemma. Liu's article specifically notes Claude Code feels slow with local models, and our pipeline depends on tool-using long-session reasoning that benefits from Sonnet's quality.

But the *non-Pi* dispatch services (`apps/thinkgraph/server/utils/dispatch-services/` — there are 17 per `thinkgraph-convergence-brief.md:25`) are mostly cheap one-shot generators (text, business-canvas, user-stories, pitch, SWOT, technical-spec). Those route through `createAIProvider` and would benefit from local Gemma.

#### Concrete files touched

| File | Change |
|---|---|
| `packages/crouton-ai/src/providers/localGemmaProvider.ts` | New |
| `packages/crouton-ai/src/createAIProvider.ts` (or equivalent) | Add local URL fallthrough |
| `packages/crouton-ai/CLAUDE.md` | Document the new provider |
| `apps/thinkgraph/.env.example` | Add `THINKGRAPH_LOCAL_MODEL_URL` |
| `docs/projects/thinkgraph-v2/brief.md:36` | Add `local-gemma` to provider list |

**Note:** `packages/` is gated by the project's package boundary rule (`CLAUDE.md` Packages Boundary). Touching `crouton-ai` requires explicit approval before edit. Don't sneak this through.

#### Sources

- [google/gemma-4-26b-a4b on LM Studio](https://lmstudio.ai/models/google/gemma-4-26b-a4b)
- [Gemma 4 announcement — Google blog](https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/)
- [Gemma 4 model card — Google AI for Developers](https://ai.google.dev/gemma/docs/core/model_card_4)
- [Running Gemma 4 locally — George Liu, Apr 2026](https://ai.georgeliu.com/p/running-google-gemma-4-locally-with)
- [Gemma 4 — Google DeepMind](https://deepmind.google/models/gemma/gemma-4/)

---

## §3 — Hardware Decision: Mac Mini M4 Pro 48GB

**Status:** Recommendation. Hardware purchase, not code.

### Sizing

LLM inference is bandwidth-bound, not compute-bound. The relevant numbers:

| SKU | RAM | Memory BW | Fits 18GB Q4 model? | Expected tok/s | Verdict |
|---|---|---|---|---|---|
| M4 base 16GB | 16 | ~120 GB/s | ❌ no | — | Skip |
| M4 base 24GB | 24 | ~120 GB/s | ⚠️ tight, small ctx | ~20-25 | Summaries-only, slow chat |
| M4 Pro 24GB | 24 | ~273 GB/s | ⚠️ tight, small ctx | ~45-50 | Bandwidth fine, ctx-starved |
| **M4 Pro 48GB** | 48 | ~273 GB/s | ✅ matches reference | **~51** | **Sweet spot** |
| M4 Pro 64GB | 64 | ~273 GB/s | ✅ + headroom | ~51 | Future-proof for 70B Q4 (~40GB) |

**Recommendation: M4 Pro 48GB.** Same chip as the article's reference benchmark, so 51 tok/s is the realistic number. The 24GB tier is a trap — the model fits but 256K context windows OOM and a single long node-chat session blows up. The jump from 24→48 is the only one that matters.

64GB only if you want headroom for a future Llama 3.3 70B Q4 (~40GB) or running two models concurrently.

### Why Mac Mini > MacBook for this specific job

1. **Always-on.** Laptop closes, AI dies. Mini sits on a shelf, every dev machine + the Nuxt app + the Pi worker can hit it 24/7.
2. **Architectural symmetry.** You already have a "home server doing the AI work, reached via Cloudflare tunnel" pattern with the Pi (`pi-api.pmcp.dev`, see `MEMORY.md` → `project_pi_dispatch_setup.md`). A `mac-api.pmcp.dev` tunnel to LM Studio is the same playbook with zero new concepts. Reuse `cloudflared` config.
3. **No laptop battery/thermal penalty.** Gemma at 51 tok/s pulls real wattage; you don't want it on your knees during a meeting.
4. **Quiet, low power.** ~5-30W idle/load, fanless under most conditions.
5. **Pi 5 cannot host this.** The Pi has 8GB RAM cap and ~17 GB/s memory bandwidth. Hosting Gemma on the Pi is impossible. The Mac Mini and the Pi become **complementary**: Pi runs Claude Code agent sessions (high-capability), Mac Mini runs the local Gemma endpoint (high-volume cheap). Both behind the same tunnel pattern.

### Concrete deployment

1. Mac Mini M4 Pro 48GB on the LAN, hostname `mac-mini.local` (or whatever).
2. `lms daemon up` + `lms get google/gemma-4-26b-a4b` + `lms load google/gemma-4-26b-a4b` — wrapped in a launchd service so it survives reboot. Example launchd plist:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>ai.thinkgraph.lms</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/lms</string>
    <string>daemon</string>
    <string>up</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict>
</plist>
```

Save as `~/Library/LaunchAgents/ai.thinkgraph.lms.plist` then `launchctl load`.

3. **Local dev (LAN only):** point `THINKGRAPH_LOCAL_MODEL_URL=http://mac-mini.local:1234/v1` in `apps/thinkgraph/.env`. Done. Zero code changes once §2.4's provider is in.

4. **Production / remote access:** `mac-api.pmcp.dev` Cloudflare tunnel mirroring the Pi setup. Bearer token auth same as `DISPATCH_SECRET`. Now Cloudflare-hosted Nuxt + the Pi worker itself can both reach the local Gemma endpoint from anywhere.

5. **Pi worker integration (optional, future):** the worker can call the Mac Mini for cheap subtasks (classify, summarize, decompose) while keeping Sonnet for builder/reviewer/merger. Routing lives in the v2 `provider` field. Don't do this in v1 of the integration — get the in-app side working first.

### Cost comparison

- **Mac Mini M4 Pro 48GB:** ~$1,999 one-time (US pricing, configure-to-order)
- **Equivalent Anthropic API spend** on summary/expand/synthesize/digest calls at moderate use: probably crosses $2k within 6-12 months, faster if the canvas-as-FigJam-replacement vision lands and brainstorm volume goes up
- **Plus:** privacy (brainstorms never leave home), zero per-call latency variance, works offline, no per-call Anthropic spend for the routed traffic

The Mac Mini is essentially a paid-up-front API key with infinite quota for cheap tasks. It pays itself back, the question is just the timeline.

### Caveats

- **~10B-equivalent quality.** Don't try to route reviewer/builder through it. Stay disciplined: cheap structured tasks only.
- **Single point of failure.** If the Mini reboots and `lms` doesn't auto-load, the app calls fail. The §2.4 fallback to cloud Anthropic on connection error is mandatory.
- **Model upgrades.** Gemma 4 26B-A4B is current as of Apr 2026. Revisit quarterly. The MoE architecture means a 50B-A8B successor would still fit 48GB at Q4.
- **Tool calling fidelity.** Verify Gemma 4 26B-A4B's function/tool-calling quality on a sample of our use cases (especially the structured JSON outputs from `expand-with-context.post.ts`) before committing the routing. The model card claims tool support; test it before depending on it.

---

## §4 — External Projects Evaluated

Six external projects/articles were assigned to subagents for parallel evaluation against `apps/thinkgraph/`, `apps/thinkgraph-worker/`, and `docs/projects/thinkgraph-v2/`. Summary table, then one paragraph each.

### Verdict table

| Project | What it is | Verdict | Steal | Why |
|---|---|---|---|---|
| `pi-vcc` | Conversation compactor for Pi runtime | ✅ Vendor | Extraction core, 4-section schema, sticky/volatile merge | Hook is real, fits v2 markdown layer + maxSteps fix |
| Loro CRDT | Rust-core CRDT, alternative to Yjs | ❌ Skip | Fractional-index movable trees as a *pattern* | Migration cost very high; nothing v2 needs is blocked by Yjs |
| `pi-messenger` | Filesystem-based agent-to-agent coordination | ❌ Skip | File reservation primitive (when Phase 1 multi-step parallel lands) | Single-host, no transport — wrong layer |
| `pi-claude-bridge` | Claude Code as a Pi provider | ❌ Drop | Orphan-tool-result cleanup pattern (reimplement, don't import) | Built on banned subscription OAuth — about to break |
| Gemma 4 26B-A4B local | Local LLM via LM Studio | ✅ Adopt | OpenAI-compatible endpoint pattern via `@fyit/crouton-ai` | Real perf, real model, real cost savings — see §2.4 + §3 |
| Fine-tuning local LLM | LoRA on Mac (Sandseb article) | ⏸ Defer | Possibly: tune 3B for summary generation | Real but small fish; revisit when summaries become a budget item |

### §4.1 — pi-vcc (https://github.com/sting8k/pi-vcc)

Already covered in §2.3. Verdict: **vendor extraction core, do not depend.** The `session_before_compact` hook is verified real in our pinned `@mariozechner/pi-coding-agent` version (`extensions/types.d.ts:313, 674`). The 4-section schema (Goal / Files & Changes / Outstanding / Transcript) maps onto the v2 brief's `<details>` markdown blocks. Skip the User Preferences section. Vendor into `apps/thinkgraph-worker/src/compact/`.

### §4.2 — Loro CRDT (https://loro.dev/docs)

A Rust-core CRDT library with movable trees, movable list items, built-in version DAG, and rich shallow snapshots. Strictly more capable than Yjs in those specific areas.

**Verdict: skip migration.** The audit confirmed all the Yjs file paths the subagent cited (`packages/crouton-flow/app/composables/useFlowSync.ts`, `packages/crouton-collab/server/durable-objects/CollabRoom.ts`, `apps/thinkgraph-worker/src/yjs-client.ts`). Yjs is load-bearing across the stack — `crouton-flow`, `crouton-collab`, `crouton-pages`, `crouton-editor`, **and the Pi worker is itself a Yjs peer** (the most architecturally distinctive thing ThinkGraph has). y-prosemirror, y-codemirror, Hocuspocus, tiptap collab — all Yjs-native. Loro has nothing comparable.

The only thing Loro is genuinely better at is movable trees for phase containers (v2 brief Phase 3, FigJam-style groups). And that can be modeled in Yjs with `{parentId, fractionalIndex}` per child without switching CRDTs. **Steal the pattern, not the library.**

Reconsider Loro only if v2 Phase 3 hits a real concurrent-move limit, or offline-first with deep version history becomes a product feature. Current evidence: neither will happen.

### §4.3 — pi-messenger (https://www.npmjs.com/package/pi-messenger)

A multi-agent communication extension for the Pi coding agent (despite the name, **not** a Raspberry Pi tool). Lets multiple Pi sessions on one host coordinate via file-based messaging — join a "room", reserve files, send DMs/broadcasts, orchestrate task crews. No daemon, no server: state lives in `~/.pi/agent/messenger/` and `<project>/.pi/messenger/`.

**Verdict: skip — wrong layer.** Our dispatch problem is *cross-host* (cloud Nuxt → Pi worker over Cloudflare tunnel), and pi-messenger is filesystem-only single-host. It doesn't touch the Cloudflare tunnel reliability problem, doesn't help bidirectional cloud↔Pi comms (already solved via Yjs), and doesn't help terminal streaming (parked).

**One pattern worth borrowing**, when Phase 1 multi-step pipelines start running parallel sessions on the same Pi: **file reservation** (`reserve(paths, reason, ttl)`). Currently `session-manager.ts` has no inter-session lock. If two sessions on the same Pi both decide to edit `apps/foo/CLAUDE.md`, they'll stomp on each other. A reservation primitive — even a simple file-lock — prevents this. Reimplement; don't import.

**One subagent claim I haven't independently verified:** that pi-messenger is by `nicobailon`, that it uses `pi.sendMessage` with `triggerTurn: true`, and that it has no auth model. These are claims about an npm package the subagent fetched and I haven't double-checked. Low stakes since the recommendation is "skip" — but flagged for honesty.

### §4.4 — pi-claude-bridge (https://github.com/elidickinson/pi-claude-bridge)

A TypeScript Pi extension that registers Claude Code as a Pi provider via `pi.registerProvider("claude-bridge", ...)`. Uses `@anthropic-ai/claude-agent-sdk`'s `query()` generator to invoke Claude. Bridges Pi's TUI tool ecosystem to Claude Code by exposing Pi tools as an in-process MCP server.

The original subagent recommended **two targeted steals**: orphan-tool-result cleanup on abort, and the `jsonSchemaToZodShape` + MCP-server-wrapping pattern.

**Revised verdict: drop the recommendation.** Two reasons:

1. **The bridge is built on the now-banned subscription OAuth pattern.** Its README requires a logged-in `claude` CLI on the host, which means it piggybacks on Pro/Max OAuth. That's exactly what Anthropic killed Apr 4. The project is on borrowed time. Importing patterns from a doomed dependency is technical debt with a very short fuse.

2. **The orphan-tool-cleanup pattern is still worth understanding** — our `handleAbort` (`session-manager.ts:357`) doesn't cleanup pending tool promises and could leak unhandled rejections. But we should reimplement it from first principles after observing the actual behavior in our worker, not copy from a project that's about to break and that we can't easily verify still works the way the subagent described.

3. The MCP-server-wrapping pattern is entirely unnecessary for us. `claude-agent-sdk` itself supports MCP natively. If we ever switch to it (per §1.8), we don't need a bridge.

**Action:** add a note in `session-manager.ts:357` (the `handleAbort` method) to investigate whether in-flight tool promises leak when an abort fires mid-session. If they do, write a fix from scratch. Don't reference pi-claude-bridge.

### §4.5 — Local Gemma (https://ai.georgeliu.com/p/running-google-gemma-4-locally-with)

Already covered in §2.4 and §3. Verdict: **adopt for cheap structured tasks, do not touch the Pi worker pipeline.** Verified facts: Gemma 4 26B-A4B is real, LM Studio supports it day-0, 51 tok/s on M4 Pro / 48GB is the documented benchmark, the article is real and the CLI commands work. Pair with Mac Mini hardware purchase.

### §4.6 — Fine-tuning a local LLM in your Mac (https://sandseb.substack.com/p/fine-tuning-an-llm-on-your-mac-in)

The article describes a slick MLX+LoRA workflow on M-series for fine-tuning a small (Llama 3.2 3B 4-bit, ~5GB RAM) model in 5-15 minutes with 400 iterations at rank 8. Use case: replace a generic local model with a domain-tuned one for repeatable, structured output.

**Verdict: defer.** Reasoning:
- The Pi worker runs Claude Code (Sonnet/Opus) — quality bar is high. A 3B local model won't match it for code review or builder work.
- The narrow win would be **summary generation** — the v2 brief's auto-generated one-liner per node (`brief.md:32`) is exactly the kind of high-volume, latency-tolerant, repeatable task a tuned model excels at.
- ThinkGraph's volume is too low *today* to make summary token cost a real bottleneck. Anthropic API spend isn't yet the binding constraint.

**Capture as `/mcp-idea`:** "Fine-tune local 3B for node summary generation. Training data = existing brief→summary pairs. Trigger condition = monthly summary generation cost crosses $50 OR offline-mode becomes a product requirement."

### §4.7 — discoveryMode / disable-memories config tip

The user shared this from another community member:

> "I personally disable memories, keep `discoveryMode: true` for MCPs, `skills.enableClaudeUser: false` and `commands.enableClaudeUser: false` stops Claude Code from pulling in your `~/.claude/` skill library. I try to stay under 25-30% context window usage, and use the /handoff command when I'm approaching that limit."

**Verdict: validates current architecture rather than prescribing changes.** Specifically:

- The Pi worker uses `PiSessionManager.inMemory()` (`session-manager.ts:197`) per session — there's no cross-session memory leakage by design. ✓ aligned.
- Tools are hardcoded via `createPMTools()` / `createThinkGraphTools()` (`pm-tools.ts`, `pi-extension.ts`). No MCP discovery. ✓ aligned.
- No ambient `~/.claude/` skill loading because the worker isn't Claude Code itself, it's `@mariozechner/pi-coding-agent`. ✓ aligned.

The "30% context window" guidance is what motivated §2.2.

**Action: one-line README addition** to `apps/thinkgraph-worker/README.md`:

> The worker intentionally runs with a minimal tool surface — only `createPMTools()` and `createThinkGraphTools()`. Do not add ambient tool/skill loading. Verify the systemd unit does not mount `~/.claude/` or `~/.pi/agent/skills/`.

And a one-time audit: check the systemd unit file at `apps/thinkgraph-worker/thinkgraph-worker.service` (or wherever it's installed on the Pi) to confirm no `~/.claude` mounts.

---

## §5 — Audit Retrospective

Six subagents did parallel research. After the user pushed back on the auth claim, I ran a verification pass. Here's the honest scorecard, with methodology lessons.

### What I verified directly

| Subagent | Claim | Verification | Result |
|---|---|---|---|
| 1 (pi-vcc) | `session_before_compact` is a real hook in our pi-coding-agent version | Read `apps/thinkgraph-worker/node_modules/@mariozechner/pi-coding-agent/dist/core/extensions/types.d.ts:313, 674` | ✅ Verified |
| 1 (pi-vcc) | `implementation-notes.md:71-75` mentions "Assistant maxSteps Exhaustion" | Read the file | ✅ Verbatim match |
| 1 (pi-vcc) | `implementation-notes.md:53` flags retrospectiveFooter as "kitchen sink" | Read the file | ✅ Verbatim match |
| 1 (pi-vcc) | `brief.md:198-205` contains the `<details>` block | Read the file | ✅ Verbatim match |
| 2 (Loro) | `useFlowSync.ts`, `CollabRoom.ts`, `yjs-client.ts` exist at cited paths | `ls` | ✅ All exist |
| 5 (Gemma) | Gemma 4 26B-A4B exists | WebSearch + WebFetch on the LM Studio model page and the Google blog | ✅ Real model, day-0 LM Studio support |
| 5 (Gemma) | The article + 51 tok/s benchmark | WebFetch on `ai.georgeliu.com/p/running-google-gemma-4-locally-with` | ✅ Real article, numbers match |
| 5 (Gemma) | Active params: subagent said "3.8B" | WebSearch | ❌ Actual is 4B (the "A4B" in the name literally means active 4B). Minor — doesn't change the recommendation. |
| 6 (TDD/handoff) | `buildPMPrompt:499`, `analystInstructions:554`, `builderInstructions:633`, `reviewerInstructions:687` | Grep on session-manager.ts | ✅ All line numbers correct |
| 6 (TDD/handoff) | Token tracking exists at `:400-410` in `handleSessionEvent` | Read | ✅ Verified |
| 6 (TDD/handoff) | `pm-tools.ts:99-103` artifacts array is open-typed | Read | ✅ Verified |

### What was wrong

**Subagent 4 (pi-claude-bridge) — wrong on the conclusion that mattered most.** Claimed pi-claude-bridge represented a safer auth path. It's actually built on the *banned* subscription OAuth pattern. The "2 targeted steals" recommendation rested on a project that's about to break. Code-pattern claims (orphan-cleanup, MCP wrapping) are plausible but unverified.

**Auth analysis (across subagent 4 and the original auth followup):** wrong on two independent counts.
1. Checked `~/.pi/agent/auth.json` on the Mac (empty), missed that the worker runs on the Pi. Should have known the worker is a Pi-side daemon — `MEMORY.md` literally says so.
2. Misread the priority chain in `auth-storage.d.ts:115-122`. Assumed env var dominated OAuth. Actual order: OAuth (3) > env var (4). The user remembered logging in with auth and pushed back; verification confirmed they were right.

**Subagent 5 (Gemma) — minor numerical error.** "3.8B active" should be "4B active". Doesn't change the architectural recommendation but is worth knowing for any precise capacity planning.

### What I haven't verified

| Item | Why not |
|---|---|
| Subagent 3 (pi-messenger) facts | Recommendation is "skip", low stakes |
| Subagent 4 (pi-claude-bridge) code-pattern claims | Recommendation is now "drop", verifying further is wasted effort |
| Subagent 6 (fine-tuning article) claims | Recommendation is "defer", low stakes |

If any of these get re-elevated to "build it" status, verify before acting.

### Methodology lessons

1. **Don't trust subagent claims about safety/sanctioning without filesystem verification.** The pattern across the misses: agents were confidently wrong on *meta-claims* ("this is safe", "this is the sanctioned approach", "we're not exposed") because verifying those required either checking the right machine or reading priority chains carefully. Code/file/architecture claims held up.

2. **`grep` and `ls` are cheap. Use them.** Several of the mistakes would have been caught by 30 seconds of direct verification. Subagents pulling from npm pages, READMEs, or web articles should always be cross-checked against the actual filesystem state when their claim hinges on it.

3. **My own "I can't verify, my training cutoff is May 2025" line was lazy.** I have `WebFetch` and `WebSearch`. The honest answer is "let me check," not "I have no way to verify." This applies to any factual claim about external libraries, recent articles, or model releases.

4. **When the user pushes back, take it seriously immediately.** The auth pushback ("i thought we logged in with auth") was the entire reason this got caught. Don't reflexively defend a prior conclusion — verify it again, on the right machine, with the right priority order in mind.

5. **Subagent prompts should be specific about which machine/environment matters.** When dispatching the auth research, the prompt should have said "the Pi worker runs on a Pi 5 at `pi-api.pmcp.dev`, not on this Mac" — that one sentence would have prevented the wrong-machine check.

6. **Don't depend on patterns from doomed dependencies.** The pi-claude-bridge auth situation is a specific case of a general lesson: if a project's foundation is being banned/deprecated/EOL'd, even good patterns from it carry risk because you can't easily diff-check or pull updates.

---

## §6 — Open Follow-ups (MCP Idea Candidates)

Capture these as `/mcp-idea` or in `.claude/mcp-ideas.md` when you tackle the next planning round:

1. **Loro fractional-index pattern for v2 phase containers.** When v2 Phase 3 (FigJam-style phase groups) is built, model node parentage as `{parentId: string, fractionalIndex: string}` in a Y.Map. Use a fractional indexing library (e.g., `fractional-indexing`) to assign indices. Avoids reorder conflicts in concurrent moves without switching CRDTs.

2. **Fine-tune local 3B for node summary generation.** Training data = existing brief→summary pairs from `thinkgraph_nodes`. MLX+LoRA on Mac. Trigger: monthly summary generation cost crosses $50, OR offline-mode becomes a product requirement, OR Mac Mini's local Gemma proves too slow for high-volume summary background work.

3. **File reservation primitive for `session-manager.ts`** when Phase 1 multi-step parallelism lands. Borrow the shape from pi-messenger: `reserve(paths: string[], reason: string, ttlMs: number)`. Reimplement, don't import. Prevents two parallel Pi sessions stomping on each other.

4. **Local JSONL telemetry feed** at `<workdir>/.thinkgraph/feed.jsonl` per session. Could unblock the parked terminal streaming feature without needing a DO relay — tail it through a new endpoint on the existing `pi-api.pmcp.dev` tunnel. Borrowed pattern from pi-messenger's session feed.

5. **Investigate orphan-tool-result cleanup in `handleAbort`** (`session-manager.ts:357`). Are in-flight tool promises leaking unhandled rejections when an abort fires mid-session? If yes, write a fix from scratch (do not reference pi-claude-bridge).

6. **`vcc_recall`-style tool for raw session JSONL access.** Once §2.3 is in, expose a `get_node_history` MCP tool that reads the raw JSONL session log on disk for debugging and "Layer 3: Full" context per `brief.md:148`.

7. **systemd audit on the Pi.** Check `apps/thinkgraph-worker/thinkgraph-worker.service` (or wherever installed on the Pi) confirms no `~/.claude` or `~/.pi/agent/skills` mounts. One-time check, document result in `apps/thinkgraph-worker/README.md`.

8. **The `LLMProvider` seam** (§1.8). Insurance against Anthropic broadening the harness ban. ~½ day. Build it the same week as §1's auth migration, not before.

---

## §7 — Appendix: File & Line Reference

Quick reference for everything cited above. All paths relative to `/Users/pmcp/Projects/nuxt-crouton/`.

### `apps/thinkgraph-worker/`

| File | Lines | What |
|---|---|---|
| `src/session-manager.ts` | 12-17 | Pi SDK imports (`createAgentSession`, `SessionManager`, `AuthStorage`, `ModelRegistry`) |
| `src/session-manager.ts` | 48-74 | `ActiveSession` interface — extend with `contextLimit`, `handoffTriggered` for §2.2 |
| `src/session-manager.ts` | 192-201 | `AuthStorage.create()` + `createAgentSession()` — auth path origin |
| `src/session-manager.ts` | 195-210 | Session creation — register `session_before_compact` hook here for §2.3 |
| `src/session-manager.ts` | 351 | `session.steer()` usage — pattern reused by §2.1 and §2.2 |
| `src/session-manager.ts` | 357 | `handleAbort` — investigate orphan tool cleanup (follow-up #5) |
| `src/session-manager.ts` | 396-468 | `handleSessionEvent` — token tracking + monitor injection point for §2.2 |
| `src/session-manager.ts` | 399-410 | Token usage accumulation — already exists |
| `src/session-manager.ts` | 455-460 | Existing `auto_compaction_start` event — keep, augment for §2.3 |
| `src/session-manager.ts` | 491-496 | `buildAgentPrompt` — routes to PM or legacy prompt |
| `src/session-manager.ts` | 499 | `buildPMPrompt` — inject HANDOFF block for §2.2 here |
| `src/session-manager.ts` | 554-630 | `analystInstructions` |
| `src/session-manager.ts` | 633-685 | `builderInstructions` — insert TDD steps for §2.1 |
| `src/session-manager.ts` | 687-777 | `reviewerInstructions` — insert TDD evidence check for §2.1 |
| `src/session-manager.ts` | 779-... | `mergerInstructions` |
| `src/pm-tools.ts` | 32-71 | `createPMTools` — `update_workitem` definition |
| `src/pm-tools.ts` | 99-103 | Artifacts array — open-typed, no schema change needed for handoff/test_approval |
| `src/config.ts` | (WorkerConfig) | Add `handoffThreshold` for §2.2, `localGemmaUrl` for §2.4 |
| `src/pi-extension.ts` | 27 | `createThinkGraphTools` — non-pipeline node tool source |
| `src/yjs-client.ts` | (entire) | Yjs peer for write-back to canvas |
| `src/yjs-pool.ts` | (entire) | Pool of Yjs clients per flow room |
| `src/dispatch-watcher.ts` | (entire) | Watches dispatch queue, claims work items |
| `src/index.ts` | 24, 36-79 | Auth retry with exponential backoff |
| `src/index.ts` | 166-236 | HTTP `/dispatch` endpoint |
| `node_modules/@mariozechner/pi-coding-agent/dist/core/auth-storage.d.ts` | 115-122 | Priority chain — OAuth (3) > env var (4) |
| `node_modules/@mariozechner/pi-coding-agent/dist/core/extensions/types.d.ts` | 313-314 | `SessionBeforeCompactEvent` definition |
| `node_modules/@mariozechner/pi-coding-agent/dist/core/extensions/types.d.ts` | 634 | `SessionBeforeCompactResult` definition |
| `node_modules/@mariozechner/pi-coding-agent/dist/core/extensions/types.d.ts` | 674 | `on('session_before_compact', handler)` registration |

### `apps/thinkgraph/`

| File | Lines | What |
|---|---|---|
| `server/api/teams/[id]/thinkgraph-nodes/chat.post.ts` | (entire) | Per-node Ask AI chat — local-Gemma target |
| `server/api/teams/[id]/thinkgraph-nodes/expand-with-context.post.ts` | (entire) | 5-mode expand — local-Gemma target |
| `server/api/teams/[id]/thinkgraph-nodes/synthesize.post.ts` | (entire) | Brief synthesis — local-Gemma target |
| `server/api/teams/[id]/thinkgraph-nodes/digest.post.ts` | (entire) | Subtree digest — local-Gemma target |
| `server/api/teams/[id]/thinkgraph-nodes/brief.post.ts` | (entire) | Raw input → brief — local-Gemma target |
| `server/api/teams/[id]/thinkgraph-nodes/[nodeId]/expand.post.ts` | (entire) | Per-node expand — local-Gemma target |
| `server/api/teams/[id]/thinkgraph-nodes/[nodeId]/classify.post.ts` | (entire) | Tagging — local-Gemma target |
| `server/api/teams/[id]/thinkgraph-nodes/project-assistant.post.ts` | (entire) | Compress raw → nodes — local-Gemma target |
| `server/utils/dispatch-services/` | (directory, 17 services) | Dispatch services — most are local-Gemma targets |
| `server/utils/context-builder.ts` | (entire) | Progressive context assembly |
| `server/api/.../webhook` | (TBD locate) | Re-dispatch trigger — modify for §2.1 and §2.2 handoff |

### `packages/`

| File | What |
|---|---|
| `crouton-flow/app/composables/useFlowSync.ts` | Browser-side `Y.Map<YjsFlowNode>` |
| `crouton-collab/server/durable-objects/CollabRoom.ts` | Cloudflare DO relay for binary Yjs updates + JSON awareness |
| `crouton-ai/src/createAIProvider.ts` (or equivalent) | Provider factory — add local-Gemma fallthrough for §2.4 |
| `crouton-ai/CLAUDE.md` | Document new local-Gemma provider |

### `docs/projects/thinkgraph-v2/`

| File | What |
|---|---|
| `brief.md` | Canonical v2 spine |
| `brief.md:32` | Auto-summary generation requirement (~50 token index) |
| `brief.md:36` | `provider` field on nodes — add `local-gemma` |
| `brief.md:115-126` | Provider/model routing |
| `brief.md:128-132` | MCP composition boundary |
| `brief.md:137-161` | Progressive context disclosure (Index/Expanded/Full) |
| `brief.md:148` | Layer 3: Full context — raw session history |
| `brief.md:182-208` | Markdown node format with `<details>` block — pi-vcc compaction target |
| `brief.md:198-205` | The `<details>` conversation log block specifically |
| `implementation-notes.md:53` | retrospectiveFooter "kitchen sink" |
| `implementation-notes.md:71-75` | Assistant maxSteps Exhaustion |
| `implementation-notes.md:106-116` | Pi Worker Setup — needs auth fix (§1.7) |
| `implementation-notes.md:128-138` | Production env vars — add `ANTHROPIC_API_KEY` (§1.7) |
| `thinkgraph-convergence-brief.md` | The convergence implementation plan (kept) |
| `thinkgraph-assistant-brief.md` | Assistant identity brief — light cross-reference from §2.2 (handoff as conversation entries) |
| `crouton-thinkgraph-convergence-brief.md` | **Older draft of `thinkgraph-convergence-brief.md` — DELETED in this round** |

### `MEMORY.md` references

| Memory | Relevance |
|---|---|
| `project_pi_dispatch_setup.md` | Cloudflare tunnel pattern reused for Mac Mini in §3 |
| `project_pi_agent_setup.md` | Pi worker setup constraints |
| `project_node_conversations.md` | Handoff artifacts as conversation entries (§2.2) |
| `project_ai_canvas_presence.md` | TDD test_approval as canvas-native review surface (§2.1) |
| `project_node_creation_intent.md` | Intentional creation principle backing §2.1 |
| `project_brainstorm_canvas_vision.md` | FigJam-replacement vision driving high-volume summary use case (§2.4 + §3) |
| `project_phase_groups.md` | v2 Phase 3 phase containers (Loro fractional-index pattern, follow-up #1) |
| `project_thinkgraph_v2.md` | v2 brief overview |
| `feedback_no_delays.md` | No setTimeout for race conditions (relevant to §2.2 monitor — must be event-driven, not polled) |
| `feedback_no_wrap_up.md` | Don't suggest stopping (informs §1's "we're not tackling this just yet" framing) |

---

## §8 — What's Next (When We Choose To Act)

This document is research input, not a build queue. When you're ready to act, the suggested order is:

1. **§1 Auth migration first.** Tokens were exposed in chat; even with no time pressure on Anthropic enforcement, the rotation should happen sooner rather than later. Half a day on the Pi.

2. **§2.1 + §2.2 + §2.3 in one PR.** They share the re-dispatch infrastructure and the same `session-manager.ts` surface. Doing them together avoids two refactors. ~3-4 days total.

3. **§2.4 + §3 in parallel.** Order the Mac Mini, build the local-Gemma provider while it's in transit. ~½ day code, hardware lead time.

4. **Doc fixes** (§1.7) folded into the auth migration PR.

5. **Follow-ups #1-#8** captured as `/mcp-idea` entries — none are blocking, all are real.

The total scope above is bounded: ~5-6 days of focused work for items 1-4, plus the hardware purchase. Not a quarter-long epic. The reason this brief exists is to make sure when we do come back to it, the analysis is preserved and the corrections from this conversation aren't lost.