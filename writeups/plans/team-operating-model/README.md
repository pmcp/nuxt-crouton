# Team Operating Model — the plan

**What this is:** the target way our team of five (CEO · CTO · PM · 2 devs) + AI agents work together
across the whole stack — and a phased plan to actually build it. Designed in a working session on
2026-06-19; everything here is **draft for discussion**, not yet committed work.

## What's in this folder

| File | What it is |
|---|---|
| `operating-model.md` | The written model — layered ownership, the 4 user journeys, capture-from-anywhere, closing the loop, the measurement loop. **Start here.** |
| `diagram-1-workflow-loop.svg` | The whole picture: tools → GitHub engine → design/docs loops → runners & preview targets → PostHog measurement. Two return loops (results up the right, evidence up the left). |
| `diagram-2-idea-to-shipped.svg` | How Notion · GitHub · Linear fit together (layered ownership + the agent bridge). |
| `diagram-3-friction-map.svg` | The flagship journey as 15 granular steps across 5 phases, with friction/stall points flagged in red. |
| `diagram-1-workflow-loop.html` | Interactive (Mermaid) version of diagram 1 — needs internet to render; the `.svg` is canonical. |

> Open the `.svg` files as images (they render anywhere, no internet needed).

## The stack we're wiring together

📚 Notion (product intent) · ⚙️ GitHub (execution truth) · 📋 Linear (planning lens) ·
💬 Slack (front door + feedback) · 📣 HubSpot (the outside world) · 📊 PostHog (evidence) ·
▲ Vercel + ☁️ Cloudflare + 🍎 Mac mini (runners & preview targets).

## The five friction hotspots (what the plan must fix)

From `diagram-3-friction-map.svg` — these are where work stalls or leaks today, in priority order:

1. **① Capture & normalization** — turn intent from *any* surface (Slack/Claude/Codex/email) into a clean, de-duped, *owned* Notion story.
2. **⑤ Closing the loop** — the "we listened, here's the change" step that's most likely to silently never happen.
3. **④ Sign-off latency** — gates that block on a human looking; the top throughput bottleneck.
4. **③ Notion→GitHub handoff** — no native sync; fidelity + "what if the story changes?" unsolved.
5. **② The "ready" gate** — fuzzy human judgement; weak acceptance criteria poison everything downstream.

---

## The rollout plan

Sequenced for **value-first, lowest-risk-first** — read-only/notify before write/automate.

### Phase 0 — Today (already works) ✅
The GitHub agent loop (orchestrator → decomposer → worker), UI/schema **sign-off gates**, Cloudflare
**staging previews**, Playwright **e2e + video**, the **postmortem** self-improving loop. PostHog
already measures the product; Vercel already hosts the marketing site + dashboards.
*Foundation to build on — don't rebuild it.*

### Phase 1 — Feedback into Slack (notify first) 🔔💬
Wire Slack as the **feedback surface**: 🔔 pings (CI red · needs sign-off · preview ready ·
`status:blocked` · daily digest) and 💬 replies to status queries (*"what's outstanding on epic X?"*).
Read-only — no writes yet. *Addresses hotspot ④ (surfaces blocked work fast).*
**Done when:** a CI failure and a "needs sign-off" both ping the right channel, and a status question gets an in-thread reply.

### Phase 2 — Capture from anywhere → Notion ✳️→📚
The biggest friction. A **capture agent** turns intent from any surface into a **draft Notion story**
(persona · need · rough acceptance), runs a **dedup** check, pings a human to **confirm**, and tags
**who asked** (identity travels for closing the loop later). *Addresses hotspot ① (and feeds ⑤).*
**Done when:** a message in Slack/Claude/Codex reliably becomes a confirmed, de-duped Notion story with the requester attached.

### Phase 3 — Notion → GitHub bridge + Linear mirror 📚→⚙️↔📋
The **agent bridge**: a ready Notion epic page + its stories → a GitHub **epic + sub-issues**,
backlinked both ways. Turn on the **native Linear↔GitHub** two-way sync. **Decide the open question:**
do Notion stories go read-only after handoff, or stay editable + re-sync? *Addresses hotspots ③ and ②.*
**Done when:** marking an epic "ready" produces a correct, backlinked GitHub epic + sub-issues, mirrored into Linear.

### Phase 4 — Close the loop (changelog + evidence) 🔁📊
Auto-generate a plain-language **changelog** ("what changed & why") on ship and **route it back to the
requester** (HubSpot for customers, Slack for internal). Wire the **PostHog evidence path**: observed
product friction → a new captured story; validate the bet → into the postmortem. *Addresses hotspot ⑤
and closes the outer measurement loop.*
**Done when:** a shipped change notifies its original requester automatically, and a PostHog signal can spawn a new story.

### Phase 5 — Mac mini runner + physical tests 🍎
Stand up the **Mac mini** as an always-on runner for macOS/Apple builds and **physical device tests**
(e.g. the CDJ spike). A ticket can route work to it and get a result back on the PR. *(From the
original handoff briefing's Phase 1/3.)*
**Done when:** a ticket routes a job to the Mac mini and an asserted result posts back on the PR.

*(Phases 1–2 can overlap. 3 depends on 2. 4 depends on 3. 5 is independent and can run in parallel.)*

---

## Open decisions (carried, not yet locked)

1. **Slack intake target** — does a captured request default to Notion (product) vs straight to GitHub (execution)? Likely "triage by type."
2. **Source of truth** — confirmed direction: *layered ownership* (Notion=product, GitHub=execution, Linear=planning), not one tool.
3. **Notion handoff** — read-only after bridge, or editable + re-sync? *(blocks Phase 3 detail)*
4. **Slack-bot first capability** — pings vs status-replies vs create-story vs kick-off-epic. *(Phase 1 picks one)*
5. **Changelog mechanics** — how the summary is generated and where it's stored. *(Phase 4)*
6. **Mac mini** — which box, where it lives, who administers it; CDJ device/protocol. *(Phase 5)*

## Next steps in the design conversation (not yet done)

- Draw the **other journeys** (bug / chore / UI-change / marketing-page) as their own friction maps.
- **Zoom into the capture layer** (hotspot ①) — it now has two inputs: humans *and* PostHog evidence.
- Decide the **open questions** above so the phases can be turned into GitHub epics.
