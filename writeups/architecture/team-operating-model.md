# Team Operating Model — how we work together (humans + agents)

**Status:** draft for discussion · **Date:** 2026-06-19
**Audience:** the team of five (CEO · CTO · PM · 2 developers) — and the AI agents that work alongside us.

> This is the *operating model*, told mostly through **user journeys**. It's the companion to the
> diagrams in this folder:
> - `team-workflow-loop.svg` — the whole picture (tools · engine · loops · runners)
> - `team-idea-to-shipped.svg` — how Notion · GitHub · Linear fit together
> - `team-journey-feature-request.svg` — the flagship journey below, drawn out

---

## The one idea: layered ownership, not one "source of truth"

We don't force everything into one tool. Each tool owns the job it's best at, and an agent (or a
native sync) bridges the seams.

| Tool | Owns | In one line |
|---|---|---|
| 📚 **Notion** | Product intent | The **normalized inbox of intent** — personas, user stories, the *why*. Any request, from anywhere, lands here as a story (you don't hand-author it). |
| ⚙️ **GitHub** | Execution truth | Issues, code, agents, PRs. Authoritative for the **state of the work**. |
| 📋 **Linear** | Planning view | The board humans triage/prioritise in — a live two-way **mirror** of GitHub. |
| 💬 **Slack** | The front door | Ask in plain language, get replies. Routes intent to the right tool. |
| 📣 **HubSpot** | The outside world | Where customer requests come in — and where "here's the change" goes back out. |

**The two seams that matter:**
- **Linear ↔ GitHub** = first-class **native** two-way sync (free, automatic).
- **Notion → GitHub** = **no** deep native sync, so an **agent bridges it**: it reads a ready epic
  "work page" + its stories and creates a GitHub epic + sub-issues, backlinked both ways. *(Whether
  Notion stories then stay editable-and-resynced or go read-only is still an open decision.)*

---

## Closing the loop (the part everyone forgets)

Every journey ends the same way: when work ships, a **plain-language changelog** — *what changed and
why it matters* — is produced and routed back to **whoever asked**:

- A **customer** request → reply goes back out through **HubSpot / email**.
- An **internal** request → reply lands in the **Slack** thread where it started.
- **Everyone** → it accumulates into a release changelog / the daily digest.

This is the payoff line of the whole system: **"we listened to you — here's the change."**

---

## Capture from anywhere → Notion (intake is *not* "write a story")

The system has **no single front door**. Intent can appear on *any* surface — a **Slack** message, a
remark inside a **Claude** session, a note dropped in **Codex**, a **customer email** in HubSpot, a
voice memo. Wherever it lands, a **capture agent** picks it up and turns it into a **draft Notion user
story** (title · persona · the underlying need · rough acceptance). The human never sits down to
"author a story" — they just express a need where they already are, and confirm the draft.

Notion is therefore the **normalized inbox**: many messy inputs in, one consistent shape out.

This capture step is also where **most of the friction lives** — see the flags (⚠️) below and the
`team-journey-feature-request.svg` friction map.

---

## The journeys

Legend: 👤 = human · 🤖 = agent · 🔁 = closing the loop · ⚠️ = **friction** (manual, lossy, ambiguous, or a place work stalls).

### Journey 1 — Feature request, granular (capture-anywhere → ship → notify) · *the flagship*

**Phase A · Capture (from anywhere → Notion)**
1. ✳️ Intent appears on *some* surface (Slack / Claude / Codex / HubSpot email / voice note).
   ⚠️ *Is this a request or just chatter?* Something has to decide "this is actionable."
2. 🤖 A **capture agent** normalizes the free-form text into a **draft Notion story** (persona + need + rough acceptance).
   ⚠️ *Extracting a clean need from messy input; guessing the persona; surfaces carry uneven context.*
3. 🤖 **Dedup** check — new story, or a sibling/duplicate of an existing one?
   ⚠️ *Fuzzy matching: a false "new" clutters Notion; a false "dup" loses the signal.*
4. 👤 PM is pinged: *"captured this as a draft — right?"* — confirms / edits / merges.
   ⚠️ *Needs a human to validate or garbage accumulates.* 🪪 *Who asked? The requester's identity must ride along from the origin surface so we can close the loop later.*

**Phase B · Shape (stories → epic → ready)**
5. 👤 PM links the story to **related stories** (Notion relations).
   ⚠️ *Relations are manual; easy to miss an existing related story.*
6. 👤 PM groups a cluster into an **epic "work page"** for a sprint.
   ⚠️ *"When is a cluster ready?" is judgement, not a rule — premature grouping = churn.*
7. 👤 PM marks the epic **ready** (or says so in Slack).
   ⚠️ *"Ready" is a fuzzy gate; missing acceptance criteria here cascade downstream.*

**Phase C · Bridge (Notion → GitHub)**
8. 🤖 The **agent bridge** reads the epic + stories → creates a **GitHub epic + sub-issues**, backlinked.
   ⚠️ *Mapping fidelity (one story → one issue, or several?); acceptance criteria must translate.* ⚠️ *It's a handoff — if the Notion story later changes, do the issues update? (open decision)*
9. 🤖 Writes back Notion↔GitHub backlinks; mirrors to **Linear** (native two-way).
   ⚠️ *Bot identity — synced comments arrive as a bot user, which our agent triggers may ignore.*

**Phase D · Do the work (humans + agents)**
10. 👤🤖 Sub-issues are **routed**: agents take well-scoped ones, devs take gnarly ones; planned in Linear.
    ⚠️ *Who decides the split? Capacity/assignment is judgement; mis-routing wastes a worker.*
11. 🤖 Agents work in worktrees → **PRs with preview URLs + screenshots**.
12. 🚦 UI/schema **sign-off gates** pause for 👤 approval; devs review diffs; 🤖 revises.
    ⚠️ ***Latency — the gate blocks until a human looks. This is the #1 throughput bottleneck.*** ⚠️ *Review round-trips cost context each time.*

**Phase E · Ship + close the loop**
13. 👤 Approve → merge → deploy to staging → preview link.
14. 🤖 Generate a plain-language **changelog** ("what changed & why").
    ⚠️ *Phrasing for a customer vs the team; mapping the shipped change back to the original requester across surfaces (the identity from step 4).*
15. 🔁 Route it back: **HubSpot/email** to the customer, **Slack** to the team, **digest** for everyone.
    ⚠️ ***"Did we actually tell them?" — closing the loop is the step most likely to silently drop.***

**Friction hotspots (where to focus first):** ① capture & normalization (steps 1–4) · ② the "ready" judgement (7) · ③ the Notion→GitHub handoff fidelity (8) · ④ sign-off latency (12) · ⑤ closing the loop (15).

### Journey 2 — Bug (support report → fast fix → notify) · *the dev view*

1. 🐞 A customer or teammate reports a bug (in **Slack**, or via support → **HubSpot**).
2. 👤/🤖 It's logged straight as a **GitHub** issue labelled `bug` — **skipping Notion**, because a
   bug is execution, not product discovery.
3. 🤖 An agent **triages**: reproduces it, writes a **failing test** (the e2e harness), pins the cause.
4. 🤖 Agent proposes a fix on a branch → PR with the fix + the **now-passing test** + a before/after
   screenshot or video as proof.
5. 👤 Dev reviews the small, focused diff and approves → merge → deploy.
6. 🔁 The requester gets *"fixed in this release"* with the proof; it lands in the changelog.

**Value:** the agent does the tedious repro + test-writing; the human just judges the fix. Fast, and
the regression test means the bug can't silently come back.

### Journey 3 — Chore (proactive maintenance, agent-driven, no customer) · *the dev view*

1. ⏰ A **scheduled trigger** fires — e.g. the quarterly **dependency-sweep** ticket comes due. *No
   human kicks it off.*
2. 🤖 An agent runs the sweep: bumps the catalog, runs the **typecheck + e2e gate**.
   - ✅ **All green** → 🤖 opens a PR; 👤 CTO glances and approves; merge. Done quietly.
   - ⚠️ **Something breaks** → 🤖 marks the issue `status:blocked` and asks in **Slack** with the
     specifics, because a 👤 decision is needed.
3. 🔁 No customer to notify, but it surfaces in the **daily digest** so the team sees upkeep is handled.

**Value:** invisible maintenance runs itself; humans are only pulled in when there's a real decision.

### Journey 4 — UI / design change (the Storybook ↔ Figma loop) · *design view*

1. 🎨 A PM/designer: *"the booking card looks dated"* (via **Slack** or a **Notion** story).
2. Becomes a **GitHub** issue flagged UI-touching → the **UI sign-off gate** applies.
3. 🤖 An agent generates a **mockup proposal** (before/after) on a draft PR. 👤 The team signs off on
   the *look* first — feedback goes **inline on the diff**, not on the image.
4. 🤖 Agent builds the **real component**. Because **Storybook** is the source of truth, the component
   updates there → **syncs to Figma**, so design and code never drift apart.
5. 🤖 Real screenshot proof on the PR; 👤 approve → merge.
6. 🔁 The requester sees the refreshed component live; the design system stayed consistent.

**Value:** humans approve the *intent* (the mockup) before any build time is spent, and Figma ↔ code
stay in lockstep automatically.

---

## The Slack front door — what it *is* (not yet how we'd build it)

Slack is the conversational layer over everything above. Conceptually it does two things:

- **Asks that create/act** — *"add this user story"* (→ Notion), *"kick off this epic"* (→ the GitHub
  agent pipeline), *"file a bug"* (→ a GitHub issue).
- **Asks that report** — *"what's outstanding on epic X?"*, *"what shipped this week?"* (→ reads
  GitHub / Linear and **replies in-thread**).

It's the single place a non-technical teammate can stand and reach the whole machine in plain language.
*(We're deliberately not designing the implementation yet — just agreeing on what it should feel like.)*

---

## Still open (decide later)

1. **Notion handoff** — once a story becomes a GitHub issue, does Notion go read-only, or stay
   editable and re-sync? *(undecided)*
2. **Slack-bot first capability** — status queries vs. creating stories vs. kicking off epics.
3. **Changelog mechanics** — how the "here's the change" summary is generated and where it's stored.
4. **Source-of-truth edge cases** — the layered model resolves the common case; conflicts (same item
   edited in two tools) still need a rule.
