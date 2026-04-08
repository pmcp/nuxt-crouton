# External Projects Evaluation vs ThinkGraph v2

**Date:** 2026-04-08
**Reviewer:** Claude Opus 4.6 (multi-agent research)
**Status:** Research only — no code changes made
**Purpose:** Evaluate 5 external open-source projects against ThinkGraph v2 to identify patterns worth stealing, learnings worth internalizing, and anti-patterns to avoid.

---

## 0. How to read this document

This report is written to be **evaluable by another agent or reviewer**. Each section is self-contained, opinionated, and cites concrete ThinkGraph files. The structure is:

1. **Executive Summary** — top-line recommendations and priority ranking
2. **ThinkGraph v2 baseline** — the thesis being evaluated *against*, with the known open gaps
3. **Per-project evaluations** — full detail for each of the 5 projects
4. **Consolidated priority ranking** — merged action list across all projects
5. **Cross-cutting themes** — patterns that appear in multiple evaluations (signal amplification)
6. **Open questions for the evaluator**

Each evaluation follows the same shape: TL;DR → Overlap → Steal list → Learn list → Avoid list → Verdict. This is deliberate — it makes cross-comparison mechanical.

---

## 1. Executive Summary

### The five projects

| # | Project | Stars | License | What it is | Verdict |
|---|---|---|---|---|---|
| 1 | [volcengine/OpenViking](https://github.com/volcengine/OpenViking) | 21.6k | AGPLv3 | Bytedance context DB for agents — virtual filesystem + L0/L1/L2 tiered context | **Raid for ideas, then pass** |
| 2 | [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) | 75.1k | MIT | 144-file markdown prompt library (no runtime) | **One-day raid, then pass** |
| 3 | [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo) | 19.7k | MIT | Mature eval + red-team framework for LLM apps | **⭐ Adopt as dev dep** |
| 4 | [gmuxapp/gmux](https://github.com/gmuxapp/gmux) | 42 | MIT | Go+Preact terminal multiplexer for AI agent sessions | **Raid 2 architectural ideas** |
| 5 | [bytedance/deer-flow](https://github.com/bytedance/deer-flow) | 59.4k | MIT | Super-agent harness (v2 rewrite; v1 was a LangGraph research pipeline) | **Raid 3 specific patterns** |

*Star counts as of 2026-04-08. Note: agency-agents (75k) and deer-flow (59k) are both broadly popular projects, not niche.*

### Top-line recommendation

**Highest-conviction item (closes a known bug, two independent sources):** fix the `useFlowSyncBridge.ts:124-129` ephemeral-state overwrite using **two-layer state discipline + custom reducers**. Both gmux ("runner-authoritative vs daemon-cache") and deer-flow ("custom `merge_artifacts` reducers") independently arrive at the same pattern — that convergence is the strongest signal in the report. Scoped to `crouton-flow`, gated on package approval.

**Single highest-ROI item:** adopt **promptfoo** as a dev-only eval harness. ThinkGraph has zero test files and six production prompts shipping on vibes. Half-day of work for permanent regression protection and MIT-licensed red-team coverage of the Pi dispatch path.

**Biggest structural win:** refactor `apps/thinkgraph/server/api/teams/[id]/dispatch/webhook.post.ts` into a **middleware chain** (deer-flow pattern). 450 lines of per-verdict branching becomes composable units. Unblocks stage-scoped tools cleanly. 2-3 days.

**Biggest content win:** extract the currently-inlined step prompts from `apps/thinkgraph-worker/src/session-manager.ts` into `apps/thinkgraph/prompts/steps/*.md` files using **Anthropic's Claude Code skills format** (`name`, `description`, `allowed-tools`, `model` frontmatter). This solves Phase 2C's pipeline formalization gap, gets you tooling support for free (the same format `~/.claude/agents/*.md` uses), is structurally validated by agency-agents' 144-file library, and lets Pi worker prompts be tested in Claude Code locally before dispatching. **Source correction (second verification pass, 2026-04-08):** the original report misattributed `allowed-tools` to deer-flow's `SKILL.md` format — deer-flow's actual schema only has `name` + `description`. The pattern lives in Claude Code's skills spec, not deer-flow. See revision log entry below. 1-2 days.

### Priority action list (merged)

| Rank | Action | Effort | Source | Files touched |
|---|---|---|---|---|
| **1** | Adopt **promptfoo** as dev-only eval harness for 6 pure prompts | ½ day | promptfoo | `apps/thinkgraph/evals/` (new), `package.json` |
| **2** | **Middleware chain** refactor of dispatch pipeline | 2-3 days | deer-flow | `webhook.post.ts`, `work-item.post.ts` |
| **3** | **Two-layer state discipline / custom reducers** to fix `useFlowSyncBridge` ephemeral-state overwrite bug | scoped, gated on package approval | gmux + deer-flow converge | `packages/crouton-flow/app/composables/useFlowSyncBridge.ts:124-129` |
| **4** | **Claude Code skills format** for pipeline step definitions (`name`/`description`/`allowed-tools` frontmatter) | 1-2 days | Anthropic Claude Code skills spec (validated by agency-agents at scale; deer-flow uses a thinner variant — see §3.5 correction) | `apps/thinkgraph/prompts/steps/*.md` (new), `apps/thinkgraph-worker/src/session-manager.ts`, `types.ts:37-53` |
| **5** | **`ClarificationMiddleware`** halt-and-ask for UNAVAILABLE verdict | 3-4 days | deer-flow | `webhook.post.ts`, `session-manager.ts`, `NodeChatPanel.vue` |
| **6** | **Directory-recursive retrieval** on top of Vectorize using `parentId` tree | 1 day | OpenViking | `server/api/teams/[id]/thinkgraph-nodes/search-similar.post.ts` |
| **7** | Persist **retrieval trajectory** as a `context-trace` artifact | ½ day | OpenViking | `server/utils/context-builder.ts`, artifacts schema |
| **8** | **`{pass, score, reason}`** shape for reviewer verdict (enables score-based REVISE cap) | low | promptfoo | verdict parser in `webhook.post.ts:55-75` |
| **9** | **Child self-report HTTP socket** contract for future non-Pi dispatch | medium | gmux | worker sidecar (new) |
| **10** | **Triage-first sort** in `NodeAgentActivity.vue` (stuck > needs-input > active > idle > done) | trivial | gmux | one sort function |
| **11** | **Scrollback ring buffer** — cap `agentLog` at ~128KB | low | gmux | `yjs-client.ts` |
| **12** | **Thin `thinkgraph` CLI** wrapping existing MCP tools (ls/find/grep the graph) | 1-2 days | OpenViking | new package |
| **13** | **`LoopDetectionMiddleware`** — replace count-based 3-iteration REVISE cap with progress-based detection | 1-2 days | deer-flow (added in second verification pass) | `webhook.post.ts:55-75` verdict loop |
| **14** | **Capability probes** for the 16 dispatch services — `available()` startup check, `DispatchModal` hides unavailable | ½ day | gmux `Discover()` pattern × dispatch-services audit (added in second verification pass) | `server/dispatch/services/*.ts`, `DispatchModal.vue` |

**Total:** ~2 weeks of focused work to extract every item on this list. Items 1-5 are the core recommendation; 6-14 are opportunistic.

---

## 2. ThinkGraph v2 Baseline (what we're evaluating *against*)

Every external project in this report was first read *after* the evaluating agent internalized the ThinkGraph v2 briefs. The baseline is summarized here so a reviewer can sanity-check the evaluations.

### Core thesis

- **Unified node model.** One `thinkgraph_nodes` collection with `template` + `steps` replaces rigid type hierarchies. Phase 0 shipped.
- **Configurable pipeline.** Each node's `steps` array can be customized (e.g., skip reviewer for trivial work). Stages: analyst → builder → reviewer → launcher → merger, plus meta steps (coach, analyse, synthesize, optimizer).
- **Verdicts as control flow.** Reviewer returns `APPROVE | REVISE | RETHINK | UNAVAILABLE`. REVISE currently capped at 3 iterations (count-based).
- **Markdown as the content layer.** Nodes have a `markdown` body intended to live in git (partially built — worker commit TODO at `session-manager.ts:1437-1439`).
- **Canvas as first-class HITL surface.** Per-node chat (`NodeChatPanel.vue`), Yjs-synchronized, mobile-reachable. The canvas *is* the memory.
- **Pi worker as the agent runtime.** ThinkGraph is NOT an MCP client — it exposes MCP tools, composition happens at the Pi worker level via HTTP dispatch through `pi-api.pmcp.dev` Cloudflare tunnel.
- **AI as canvas participant.** Future: AI has Yjs presence, cursor, comments — not a sidebar chat.
- **Progressive context disclosure.** `context-builder.ts` does index → expanded → full loading with a 12K token budget.

### Known open gaps (what the briefs explicitly flag as unbuilt)

These appear frequently in the Steal lists below because they're exactly the places external projects have better answers:

1. **Stage-scoped MCP tools** — spec'd in Phase 1, not shipped. All 11 tools in `server/mcp/tools/` are currently unscoped (any stage can call any tool).
2. **Source-node references in dialectic responses** — `get-thinking-path` MCP tool is agent-facing; there's no persisted trace of which nodes `context-builder.ts` actually read for a given dispatch.
3. **`useFlowSyncBridge.ts:124-129` ephemeral-state bug** — D1 row refetches overwrite Yjs-synced `agentStatus`/`agentLog` because both channels write into the same Yjs bag.
4. **Worker→app delivery has no durability layer** — Apr 7 502 incident exposed this. No outbox, no retry.
5. **Zero tests in `apps/thinkgraph`** — no `*.test.ts`, no `*.spec.ts`. Six load-bearing prompts ship untested.
6. **Rolling conversation summary** — `dispatch-conversation.ts` produces a fresh monolithic brief each dispatch; decision #2 in the assistant brief wants Honcho-style Representations.
7. **Phase 2C pipeline formalization** — `pipeline_steps` collection with "prompt template + validation rules + expected output format per step" is scoped but unbuilt. Step prompts are currently inlined in the worker.
8. **16 dispatch services registered, 15 dormant** — per `dispatch-services-audit.md`. Either consolidate or systematize.
9. **Stuck-worker detection** — `validate-graph.ts` has a `stuck-worker` check, but no alive-probe contract from the worker itself.

### Key files referenced throughout

| Concern | File |
|---|---|
| Dispatch routing | `apps/thinkgraph/server/api/teams/[id]/dispatch/webhook.post.ts` (450 lines) |
| Work dispatch | `apps/thinkgraph/server/api/teams/[id]/dispatch/work-item.post.ts` |
| Context assembly | `apps/thinkgraph/server/utils/context-builder.ts` (553 lines) |
| Conversation summarization | `apps/thinkgraph/server/utils/dispatch-conversation.ts` (356 lines) |
| Node summary generation | `apps/thinkgraph/server/utils/summary-generator.ts` (62 lines) |
| Question extraction | `apps/thinkgraph/server/utils/question-extractor.ts` |
| Template detection | `apps/thinkgraph/server/utils/template-detector.ts` |
| Graph validation | `apps/thinkgraph/server/utils/validate-graph.ts` |
| Vector search | `apps/thinkgraph/server/api/teams/[id]/thinkgraph-nodes/search-similar.post.ts` |
| Pi session lifecycle | `apps/thinkgraph-worker/src/session-manager.ts` (1768 lines) |
| Yjs pooling | `apps/thinkgraph-worker/src/yjs-pool.ts:80-130` |
| MCP tools directory | `apps/thinkgraph/server/mcp/tools/` (11 tools, all unscoped) |
| Node type definitions | `apps/thinkgraph/layers/thinkgraph/collections/nodes/types.ts:37-53` |
| Per-node chat UI | `apps/thinkgraph/app/components/NodeChatPanel.vue` |
| Agent activity feed | `apps/thinkgraph/app/components/NodeAgentActivity.vue` |
| Flow bridge (open bug) | `packages/crouton-flow/app/composables/useFlowSyncBridge.ts:124-129` |

---

## 3. Per-project evaluations

### 3.1 OpenViking (volcengine/OpenViking)

#### TL;DR

- **Context database for AI agents** from Volcengine (Bytedance). Positions itself against fragmented vector-store stacks by unifying memories/resources/skills under a virtual filesystem at `viking://` with three top-level dirs: `resources/`, `user/`, `agent/`.
- **Three-tier context loading (L0/L1/L2)**: L0 ~100-token one-liner, L1 ~2k "overview", L2 full content on demand. Claims ~10x token savings (self-reported).
- **Retrieval model:** "Directory recursive retrieval" — intent → vector hit on a directory → secondary refinement inside it → drill down → aggregate. Preserves the full browse trajectory for debugging ("visualized retrieval trajectory").
- **Stack:** Python 3.10+ / Go 1.22+ / C++ / Rust. Runs as a local HTTP service on `localhost:1933`, CLI (`ov add-resource`, `ov ls`, `ov find`, `ov grep`, `ov chat`), Python SDK. Optional `VikingBot` agent framework on top.
- **License: AGPLv3** on the core. Blocks code reuse; ideas only.
- **Maturity:** Install/config and provider abstraction (Volcengine, OpenAI, LiteLLM → Anthropic/DeepSeek/Gemini/Ollama) look shipped. Claimed benchmark of 43% task-completion lift + 91% token reduction on an "OpenClaw" integration is single-vendor self-report — treat as aspirational.

#### Overlap with ThinkGraph

| Concern | ThinkGraph | OpenViking |
|---|---|---|
| Unified data model | Single `thinkgraph_nodes` collection with `template` + `steps` | `viking://` filesystem unifying memories/resources/skills — also anti-type-proliferation |
| Progressive disclosure | `context-builder.ts` index→expanded→full, 12K budget | L0/L1/L2 — same idea, different names |
| Summarization layer | `summary-generator.ts` auto-generates ~50-token summary per node, re-embeds via Vectorize | L0 generated from L2, auto-updated |
| Retrieval | Vectorize semantic search + keyword `search-graph` + structural `contextNodeIds` | Vector + directory-recursive + grep |
| Observability | `get-thinking-path` MCP tool, Pi worker `agentLog`/`agentStatus` via Yjs | "Retrieval trajectory visualization" |
| Agent framework | Not an MCP client — exposes tools, composition at worker level | VikingBot agent framework bundled on top of the context DB |
| Persistence | D1 SQLite + Markdown-in-git (partial) | Filesystem-native from day one |

The overlap is real but narrow: both solve "how do agents navigate structured knowledge without blowing the token budget." ThinkGraph treats that knowledge as **a graph humans author**; OpenViking treats it as **a filesystem agents populate from arbitrary sources**.

#### Steal list

1. **Directory-recursive retrieval as a query strategy** (high value, medium cost). Today `search-similar.post.ts` does flat k-NN against all node embeddings in a project. Steal the pattern: first retrieve at the parent/template cluster level (top-scoring `parentId` subtrees), then re-run the query scoped inside them. ThinkGraph has `parentId` already — it's free structural locality that Vectorize doesn't exploit. Integration cost: ~1 day, pure server-side in `search-similar.ts`.
2. **Retrieval trajectory as a first-class artifact** (high value, low cost). OpenViking surfaces the browse path for debugging. ThinkGraph has `get-thinking-path` but it's agent-facing. Persist the actual node IDs that `context-builder.ts` touched for a given dispatch as a `context-trace` artifact on the node. Closes the known "source-node references in responses" gap. Integration cost: ~half day — add an array collector in `context-builder.ts`, write to `artifacts`.
3. **L0/L1/L2 naming as an internal contract** (medium value, trivial cost). `context-builder.ts` already implements three layers but they're unnamed and each caller reinvents which to fetch. Adopting L0/L1/L2 labels (or index/expanded/full — pick one and enforce) across `summary-generator.ts`, `context-builder.ts`, and the MCP tools' `detail` parameter would kill inconsistency.
4. **CLI surface for the graph** (medium value, medium cost). `ov ls`, `ov tree -L 2`, `ov find`, `ov grep` are dramatically nicer than a web UI when debugging what an agent can see. A thin `thinkgraph` CLI wrapping the existing MCP tools would pay for itself the next time Pi gets stuck. Integration cost: 1-2 days.
5. **"Skills" as a filesystem path** (low-medium value, low cost). OpenViking's `agent/skills/` idea lines up with ThinkGraph's stage-scoped MCP tools gap. If skills become node-like and live on the graph, the analyst/builder/reviewer prompt templates can themselves be nodes that evolve through the same pipeline — exactly the "meta node" pattern in `brief.md:117`. Most philosophically aligned steal.

#### Learn list

- **Filesystem-paradigm vs graph-paradigm trade-off.** OpenViking bets that agents intuit directories better than graphs (LLMs saw millions of `ls` outputs in training). ThinkGraph bets the visual canvas is worth more to humans. Both are right for their audience — but validate that Pi can actually traverse the graph efficiently; if not, expose a `viking://`-style textual projection on MCP.
- **Session auto-compression as a first-class feature.** OpenViking compresses sessions into long-term memory automatically. The open "rolling summary on the conversation" decision in `brief.md:203` is exactly the same problem.
- **Multi-provider embedding abstraction.** OpenViking supports seven embedding backends behind one config. ThinkGraph is locked into OpenAI `text-embedding-3-small`. Not urgent, but a provider abstraction upfront makes future migration cheap.

#### Avoid list

- **Don't adopt `viking://` as a storage layer.** D1 + Yjs + markdown-in-git is already the answer. Adding a Python+Go+C++ service running on `localhost:1933` next to Cloudflare Workers is architecturally insane for this stack.
- **Don't import VikingBot.** ThinkGraph explicitly decided it's not an MCP client. Pi is the agent framework.
- **Don't build "generic user modeling."** Explicitly rejected in the assistant brief ("we don't need to learn about the user, we need to reason about the work"). OpenViking's `user/` directory is the opposite bet.
- **Don't re-invent vector storage.** ThinkGraph already has Vectorize.
- **Don't take the "context database" framing.** It flattens the thesis. ThinkGraph's differentiator is the canvas + node-level conversations + AI as peer.
- **License:** AGPLv3 on the core. Reading source to learn is fine; copying code is not — the nuxt-crouton stack is not AGPL-ready.

#### Verdict

**One-time raid for ideas, then pass.** OpenViking and ThinkGraph are solving adjacent problems from opposite ends — agent-populated knowledge store vs. human-authored thinking canvas — so there's no integration path, and AGPLv3 closes the code-reuse door. But three ideas are genuinely worth lifting: directory-recursive retrieval (applied to ThinkGraph's `parentId` tree on top of Vectorize), persisting the retrieval trajectory as an artifact, and a thin `thinkgraph` CLI. Together ~3-4 days of work that sharpen things the briefs already flag as partial.

---

### 3.2 agency-agents (msitarzewski/agency-agents)

#### TL;DR

- **144 markdown files, zero runtime.** The entire project is a catalog of YAML-frontmattered system prompts (`name`, `description`, `color`, `emoji`, `vibe`) organized into 12 domain folders. Each file is self-contained, ~500–1500 words, no tool calls, no handoffs, no code.
- **Native target is Claude Code subagents** (`~/.claude/agents/*.md`). The format *is* Anthropic's subagent format. `scripts/convert.sh` + `scripts/install.sh` port the same files into 10 other tools (Cursor, Aider, Windsurf, Gemini CLI, OpenCode, Kimi, Copilot, etc.).
- **"Orchestration" is purely human-driven.** Multi-agent "scenarios" are human-assembled teams — the user picks which agent to talk to next. No inter-agent messaging, no state, no queue, no coordinator.
- **Personality-forward.** Every agent has a "vibe" line ("Reviews code like a mentor, not a gatekeeper"), an emoji, and a communication-style section.
- **Audience:** solo developers / agencies who want a curated prompt library and a one-command installer into whatever CLI they use.

#### Overlap with ThinkGraph

Narrow. Adjacent but structurally different:

| Concern | ThinkGraph | agency-agents |
|---|---|---|
| Agent definition format | Hardcoded step types in `types.ts:37-61` (`analyst/builder/reviewer/launcher/merger/coach/analyse/synthesize/optimizer`); prompts live inlined in worker `session-manager.ts` | Markdown files with YAML frontmatter, one file per role |
| Orchestration | Pipeline webhook routes nodes through stages based on verdicts | None — human picks the next agent |
| Tool scoping per role | Aspirational (Phase 1 — stage-scoped MCP tools unshipped); all 11 tools unscoped | N/A — no tools |
| State between steps | D1 `thinkgraph_nodes` + Yjs doc + `chatconversations.nodeId` | None |
| Multi-agent dispatch | Pi worker via `pi-api.pmcp.dev` tunnel, per-node session, Yjs presence | User types into a chat |
| Knowledge/memory | The graph *is* the memory | None — each agent is stateless |

**The only real overlap is the *definition* of a role** — ThinkGraph has 9 step types that each need a prompt/instruction set, and agency-agents has spent real effort on how to write a role prompt. Everything else (execution, state, routing, memory) ThinkGraph already has and agency-agents deliberately doesn't.

#### Steal list

1. **Role prompt template shape** (low cost, medium value). The YAML frontmatter + section scaffold (`Identity & Memory → Core Mission → Critical Rules → Checklist → Comment Format → Communication Style`) is a reusable skeleton for ThinkGraph's own step instructions. Current step prompts are inlined in `session-manager.ts` — pulling them into checked-in `.md` files with this frontmatter would make them diffable, reviewable, and A/B-able. Fits naturally with the unshipped Phase 1 work (stage-scoped MCP tools + per-step instructions). **Integration cost:** ~2 hours to extract existing prompts into files; ~half a day to teach the worker to load them. Folder: `apps/thinkgraph/prompts/steps/{analyst,builder,reviewer,...}.md`. **Note:** deer-flow's `SKILL.md` format (section 3.5) is the production-validated version of this same idea — prefer that schema.
2. **"Vibe" line as a forcing function** (trivial cost, small but real value). The one-sentence "vibe" is a compact way to encode tone. Drops directly into structured review verdicts — each verdict's intended tone could be a vibe line in the reviewer prompt. Fights the "analyst executes instead of evaluating" drift the brief calls out.
3. **Meta-node seed content** (free). ~20 of the 144 agents map to ThinkGraph's own gap list: `engineering-code-reviewer`, `engineering-git-workflow-master`, `engineering-technical-writer`, `engineering-incident-response-commander` (relevant to the Apr 7 502 incident / stuck-worker validator), `engineering-senior-developer`. Ingesting a few as meta nodes (Phase 4 ingestion flow) would let ThinkGraph dogfood while populating the brief for stage-scoped tools work.
4. **Naming convention `domain-role.md`** (free). Flatter, greppable alternative to ThinkGraph's current `dispatch-services/{code,mermaid,dalle3,...}.ts` sprawl. Worth copying if the dispatch-services audit consolidates the 15 dormant services.

#### Learn list

- **Portability as a product decision.** They made one format (Claude subagent markdown) canonical and wrote converters for everything else. ThinkGraph should consider whether its per-step instructions, once extracted, should be portable to raw `~/.claude/agents/` so the same analyst prompt can be tested in Claude Code before dispatching through Pi.
- **Personality as role enforcement.** The hypothesis that a named identity with a "vibe" keeps an LLM more in-role than a dry instruction list. Worth A/B testing against current ThinkGraph step prompts since role drift (analyst over-executing) is a known problem.
- **The sweet spot of "curated prompts + distribution scripts."** Zero orchestration was a deliberate choice — it let them reach 144 agents and 11 tool integrations without any backend. ThinkGraph's temptation to build ever more dispatch services (16 registered, 15 dormant) is the opposite failure mode: infrastructure before content. Lesson: **prompts ship; dispatch services rot.**

#### Avoid list

- **Don't adopt it as a dependency or submodule.** Static library with no API contract. Pulling it in drags 144 unrelated personas into a codebase that needs 9 step types.
- **Don't mistake the "team scenarios" for orchestration patterns.** The README's multi-agent examples look like workflows but are just "things a human might copy-paste sequentially." ThinkGraph's pipeline with structured verdicts and loop protection is genuinely more sophisticated.
- **Don't import the emoji-heavy, vibe-first tone wholesale.** ThinkGraph's reviewer returns `APPROVE/REVISE/RETHINK/UNAVAILABLE` — a crisp structured verdict. Layering "👁️ Reviews like a mentor" prose would dilute it. Vibe lines work inside role prompts, not as the output contract.
- **Don't let it tempt you back toward "6 rigid node types."** ThinkGraph explicitly cut the old discover/architect/generate/compose/review/deploy scheme. Seeing 144 neatly-categorized agents could re-seduce a reader into "maybe we should have 20 node templates." Resist. Templates + configurable `steps` is the decided direction.
- **Don't adopt anything from it for the canvas/Pi/Yjs layer.** It has nothing to say about human-in-the-loop UX, multi-player editing, node-level conversation, or background execution.

#### Verdict

**One-day raid for ideas, then pass.** A well-curated prompt library with a clever distribution story, but philosophically the opposite of ThinkGraph: stateless catalog vs. stateful graph, human router vs. pipeline engine, personality vs. structured verdict. The raid should take a day: lift the YAML-frontmatter-plus-section template, refactor inlined step prompts into `apps/thinkgraph/prompts/steps/*.md`, and use 3-5 engineering agent files as seed content for meta nodes. Not worth tracking upstream.

---

### 3.3 promptfoo (promptfoo/promptfoo) ⭐

#### TL;DR

- **What it is:** CLI + library for evaluating and red-teaming LLM apps. MIT-licensed. **Now part of OpenAI** — repository README states verbatim: *"Promptfoo is now part of OpenAI. Promptfoo remains open source and MIT licensed."* (The original revision log entry below "corrected" this in the wrong direction; the second verification pass on 2026-04-08 confirms current state from the live repo. Net effect: longevity risk *drops*, dev-only adoption is *more* attractive, not less.) ~19.7k stars, ~400 releases, 7.9k commits, latest release v0.121.3 on 2026-03-24 — mature.
- **Core model:** `promptfooconfig.yaml` declares `prompts` × `providers` × `tests` (with `vars`) and runs them as a matrix. Each test has `assert` blocks: deterministic (`equals`, `contains`, `contains-json`, `javascript`, `python`), semantic (`similar` via embeddings), and model-graded (`llm-rubric`, `factuality`, `answer-relevance`, `context-faithfulness`, `context-recall`, `context-relevance`).
- **Red team surface:** vulnerability "plugins" — prompt injection, jailbreak, PII leakage, BOLA/BFLA, tool misuse, harmful content, competitor endorsement. Generates adversarial inputs, runs them through your app, scores with the same eval framework, produces a risk dashboard.
- **Dev workflow:** runs locally, plugs into GitHub Actions, accepts CSV/JSONL/Sheets for test corpora, supports `defaultTest`, `$ref` reuse, and output `transform` hooks.
- **Notable foot-gun:** scores return `{pass, score, reason}`; model-graded assertions default-ignore `score` unless a `threshold` is set.

#### Relevance to ThinkGraph

promptfoo is a **tool**, not a competitor. The question is whether/how ThinkGraph should USE it. ThinkGraph is a prompt-heavy system disguised as a graph app:

| ThinkGraph surface | File | What the prompt decides |
|---|---|---|
| Summary generator (all nodes, auto-indexed to Vectorize) | `server/utils/summary-generator.ts` | The one-liner that drives context assembly |
| Conversation roundup for dispatch | `server/utils/dispatch-conversation.ts` | Goal/Decisions/Constraints that Pi actually builds from |
| Structured question extraction | `server/utils/question-extractor.ts:28` | JSON shape shown in the orange-signal UI |
| Template detector | `server/utils/template-detector.ts` | Which pipeline a node enters |
| Analyst/reviewer verdict routing | `server/api/teams/[id]/dispatch/webhook.post.ts:55-75` | APPROVE/REVISE/RETHINK/UNAVAILABLE → branch taken |
| Pi worker session prompts | `apps/thinkgraph-worker/src/session-manager.ts` | The actual work output |
| Chat endpoint | `server/api/teams/[id]/thinkgraph-nodes/chat.post.ts` | Node-level dialog |

**All of these are untested.** `apps/thinkgraph` has zero `*.test.ts` / `*.spec.ts` files. Any prompt tweak ships on vibes. That is exactly the gap promptfoo fills.

#### Steal list

1. **Adopt promptfoo as a dev-only eval harness for the 6 "pure" prompts.** `summary-generator`, `question-extractor`, `template-detector`, `dispatch-conversation` (roundup), and the analyst/reviewer verdict extractors are pure text-in/structured-out functions — ideal promptfoo territory. One `apps/thinkgraph/evals/promptfooconfig.yaml` with ~30 fixture nodes would catch regressions the next time someone swaps a model or rewords a system prompt. **Cost:** half a day to wire, zero production dependency (devDependency only). **Why:** these prompts are already shipping with hand-written output shapes and zero regression protection.
2. **Steal the assertion vocabulary — don't invent one.** `contains-json` + `javascript` for shape validation, `llm-rubric` for "is this summary faithful to the brief," `similar` for "does the new summary match the old embedding within 0.85." That trio covers 90% of what ThinkGraph needs.
3. **Red-team the Pi dispatch path specifically for tool misuse + PII leakage.** Pi worker runs with Claude Code tools and writes to git. A "prompt injection in a user brief that makes the analyst call `update_workitem` with wrong args" is a real attack surface once ThinkGraph is used by more than one person. promptfoo's `tool-misuse` and `prompt-injection` plugins already generate these probes. Wire them against a staging Pi endpoint in CI before the worker becomes multi-tenant. **Cost:** one afternoon for a minimal red-team config.
4. **Lift the `defaultTest` + `$ref` config pattern into Phase 2C's `pipeline_steps` collection.** Phase 2C proposes storing "prompt template + validation rules + expected output format" per step. promptfoo already has exactly this shape in YAML — steal the field names (`assert`, `threshold`, `transform`, `defaultTest`) so the mental model is shared between "how we test a step in dev" and "how the step validates itself in prod." **One vocabulary, two use sites.**
5. **Adopt the `{pass, score, reason}` return shape for the reviewer step.** ThinkGraph's reviewer currently returns a 4-enum verdict. promptfoo's tuple is strictly richer: verdict + confidence + rationale. The APPROVE/REVISE/RETHINK/UNAVAILABLE enum maps cleanly to `pass` + `reason`, and adding `score` enables the "cap REVISE at 3 iterations" rule to become threshold-based ("stop looping once score stops improving") instead of count-based.
6. **CI gate for `validate-graph.ts` output.** Low-hanging: run `promptfoo eval` in CI against a curated fixture DB snapshot and assert "zero errors, zero `stuck-worker` warnings." Turns the existing `check-graph` tool into a PR gate.
7. **Trajectory assertions for stage-scoped tool enforcement.** ⭐ Added in second verification pass (2026-04-08). The original report's assertion list missed promptfoo's entire `trajectory:*` family: `trajectory:tool-used`, `trajectory:tool-args-match`, `trajectory:tool-sequence`, `trajectory:step-count`, `trajectory:goal-success`, plus `skill-used` and `guardrails`. These let you assert *which tools an agent called and in what order* — exactly the missing test layer for Phase 1's stage-scoped MCP tools work. A trajectory assertion like *"reviewer step must call `search-graph` before `update-node` and must not call `dispatch-work-item`"* is the structural way to enforce stage scoping in CI without inventing a new framework. **This connects steal items #1 and #4 into a single coherent test strategy:** Claude Code skills format declares `allowed-tools` at definition time, promptfoo trajectory assertions verify them at runtime. **Cost:** included in item #1's half-day setup once the assertion vocabulary is known.

#### Learn list

- **Provider abstraction.** promptfoo's `providers:` list lets the same test run against Haiku/Sonnet/Opus side-by-side. ThinkGraph's brief already calls for **model routing per step** (Opus for analyst/reviewer, Sonnet for builder, Haiku for launcher). Same problem, same solution shape.
- **Matrix eval thinking.** "N prompts × M providers × K fixtures" is the right mental model for A/B prompt versioning.
- **Deterministic vs model-graded trade-off.** promptfoo is explicit that model-graded is "flexible but costs $ and drifts." ThinkGraph should prefer deterministic assertions (JSON shape, required fields, regex on DECISION: lines) for 80% of checks and reserve `llm-rubric` for "is this summary faithful" where deterministic fails.
- **The `threshold` foot-gun.** A score without a threshold is silently ignored. Any bespoke scoring ThinkGraph adds must pair score with threshold or it's dead weight.

#### Avoid list

- **Don't make promptfoo a runtime dependency.** It's a dev/CI tool. Pulling it into the Cloudflare Workers bundle would be absurd — promptfoo isn't designed for serverless edge and has no business inside `apps/thinkgraph-worker`.
- **Don't use promptfoo for the per-node chat.** Node-level conversations are interactive, stateful, Yjs-synchronized, and the value is in the human-AI loop, not in "does this response contain X." promptfoo's request/response/assert model is the wrong abstraction for a live chat thread. Unit-test the `buildConversationRoundup` helper (pure function), not the chat itself.
- **Don't rebuild promptfoo's red-team generator inside ThinkGraph.** Would be a 17th dormant dispatch service.
- **Don't trust `llm-rubric` alone for the reviewer step.** The reviewer is load-bearing. Model-graded evaluation of a model-graded reviewer is a hall of mirrors. Deterministic structural checks (required verdict enum, required rationale field, reachable node IDs in references) should gate first; `llm-rubric` can sanity-check rationale quality as a secondary signal.
- **Don't let promptfoo configs live in `packages/`.** Hard gate; they belong in `apps/thinkgraph/evals/` alongside the app they test.

#### Verdict

**Adopt as a dev dependency, steal specific patterns, don't let it leak into production.** ThinkGraph is flying blind on six prompts already in production and one (the reviewer) whose verdicts decide whether builder loops terminate. promptfoo is mature, MIT-licensed, and targets exactly that gap. A half-day `apps/thinkgraph/evals/promptfooconfig.yaml` with 20-30 fixtures has permanent value, and red-team plugins become relevant the moment Pi dispatch is multi-tenant. Config vocabulary is the right starting point for Phase 2C's `pipeline_steps` schema. Keep strictly out of the Workers bundle, out of `packages/`, and out of node-level chat where the abstraction doesn't fit.

**This is the single highest-ROI item across all five projects.**

---

### 3.4 gmux (gmuxapp/gmux)

#### TL;DR

- **What it is:** Two small Go binaries + a Preact web UI that wrap *any* command in a managed PTY session, grouped per-project in a browser-based sidebar. "Tmux for AI agents, phone-reachable." Go + xterm.js + SSE/WS. MIT, ~42 stars, pushed 2026-04-07 (active).
- **Who it's for:** Developers running `claude`, `pi`, `codex`, test watchers, and build processes in parallel across one-or-more machines, who want a single triage pane that says "which session needs my attention right now."
- **Notable bits:**
  - **Runner-authoritative, daemon-as-cache** architecture (`gmuxd` is stateless and rebuilds on restart).
  - **Adapters** (compiled-in, Go) recognize specific tools and parse their output into rich status.
  - **Probes** (Go or bash scripts in `~/.config/gmux/probes/`) enrich directory headings with git/PR/CI context.
  - **Child self-report API** — any process can `PUT /status` on `$GMUX_SOCKET` with no adapter needed.
  - Mobile-responsive web UI over the same URL (Tailscale story for remote).
- **Maturity:** "alpha" by its own admission, but clearly thought-through — separate `gmux`/`gmuxd`/`gmux-web` workspaces, zod-schema protocol package, SSE event taxonomy, scrollback ring buffer with DEC 2026 synchronized-output for flicker-free switching.

#### Overlap with ThinkGraph

Both sit on the **same edge of the same problem**: "I have N long-running AI agents doing work, how do I know which one needs me and how do I steer it?" But they attack it from opposite ends.

- **gmux** is bottom-up: PTY → adapter → live terminal in a browser. Zero knowledge of *what* the agent is working on. The "unit of work" is a command line.
- **ThinkGraph** is top-down: brief → node → pipeline → dispatch. The "unit of work" is a node, and Pi runs *because* of the node, not alongside it.

Concrete overlaps:

| ThinkGraph mechanism | gmux equivalent |
|---|---|
| `apps/thinkgraph-worker/src/session-manager.ts` (Pi SDK session lifecycle, accumulated output, token tracking) | `cli/gmux` + the pi adapter (PTY, scrollback, `Monitor()` status) |
| `YjsFlowPool` at `yjs-pool.ts:80-130` (ref-counted, grace-timer per canvas) | `gmuxd`'s runner-socket discovery + subscription pooling |
| `agentStatus` / `agentLog` writes from `session-manager.ts` → Yjs → UI pulsing pill | `status` SSE event (`label`, `working`, `error`) → sidebar status dots |
| MCP tool `check-graph` / `validate-graph.ts` `stuck-worker` detector | gmux's `alive` field is socket-reachability only — simpler but solves a subset |
| "Steer from your phone" (per-node chat → dispatch-conversation → `userSteer` over Yjs) | gmux WS terminal — you just type into it |
| `dispatch-watcher.ts` HTTP dispatch over `pi-api.pmcp.dev` | gmux runs locally; cross-machine is via `gmuxd` peer-linking |

The overlap is real but gmux is an orthogonal *process supervisor* layer. It would sit **below** ThinkGraph's Pi worker, not beside it.

#### Steal list

1. **Two-layer state model: "process state is authoritative and simple, application state is advisory and rich."** gmux's session-schema design principle is exactly the discipline ThinkGraph is currently violating. `node.data.agentStatus` (authoritative from Pi) and the mirrored D1 row (authoritative from HTTP) are both being written into the same Yjs bag — the open bug at `useFlowSyncBridge.ts:124-129` overwrites ephemeral state on row refetches. gmux solves this by keeping `alive`/`pid`/`exit_code` separate from `status`/`label`/`working`. **Lift:** adopt the pending "move ephemeral state to `node.ephemeral`" exactly as planned — gmux validates the direction. **Cost:** already scoped, waiting on package-gate approval.
2. **Child self-report HTTP socket (`$GMUX_SOCKET`, `PUT /status`).** Any child process can report rich status without an adapter. ThinkGraph's equivalent today is Pi-specific. If ThinkGraph ever wants to dispatch to `codex`, `claude-code`, `flux`, or any of the 15 dormant dispatch services, the right pattern is **not** 15 bespoke adapters but a generic "child reports to socket" contract. **Cost:** medium — needs a small sidecar HTTP endpoint in the worker. Maps cleanly onto `appendAgentLog`/`setAgentStatus`.
3. **Probes as script-pluggable directory intelligence.** `~/.config/gmux/probes/` runs a bash script, returns JSON, enriches the folder heading. ThinkGraph's Phase 2A `watched_repos`/`watch_reports` is a centralized cron that does the same thing but as monolithic Nitro code. **Lift the shape:** a "probe" collection where each row is `{name, script, frequency, scope}` and the runner just exec-and-JSON-parse. Turns Phase 2A's "add a repo" workflow from a migration into a UI. **Cost:** low.
4. **Triage-first sorting (not alphabetical).** The sidebar sorts by "what needs attention." ThinkGraph's canvas has no equivalent — nodes are laid out by graph structure. The missing counterpart is `NodeAgentActivity.vue`: sort sessions by urgency (stuck-worker > needs-input > active > idle > done), not by creation time. **Cost:** trivial — a sort function.
5. **Scrollback ring buffer (128KB) + DEC 2026 synchronized-output.** ThinkGraph's current `agentLog` is an append-only array in Yjs with no bound. Every reconnect replays the whole thing. Lifting gmux's "cap the buffer, replay instantly" pattern into `yjs-client.ts` would fix a latent OOM risk. **Cost:** low.
6. **Capability probes via the `Discover()` pattern.** ⭐ Added in second verification pass (2026-04-08) — this was buried in the Learn list of the original report but never elevated to an action item. gmux adapters declare a `Discover()` capability check (e.g., `pi --version`) at startup and fail closed if absent. **Direct application:** the 16 dispatch services flagged in `dispatch-services-audit.md` (15 dormant) should each implement an `available()` probe; `DispatchModal.vue` then renders only services that report available, instead of showing 16 clickable-but-broken buttons. Turns a markdown audit that drifts into an automated UI gate. **Cost:** ~½ day across all services. Listed as priority item #14.

#### Learn list

- **"Runner is source of truth, daemon is rebuildable cache."** Deeply relevant to the Apr 7 502 incident ("Worker→app delivery has no durability layer"). gmux solved the same class of problem by making `gmuxd` stateless and rediscoverable from Unix sockets. ThinkGraph's equivalent: make the Pi worker the runner-of-record, and have the app re-hydrate from worker queries on boot instead of from a D1 row that may or may not have been written. Not a direct copy, but the *principle* (rebuildability over persistence) is the exit ramp from the outbox/retry rabbit hole.
- **Adapter `Discover()` as a compile-time capability check.** Every adapter declares if it's usable on this machine (`pi --version`). ThinkGraph could apply this to the 15 dormant dispatch services — each runs a capability probe at startup, and the `DispatchModal` hides unavailable services instead of showing 16 clickable-but-broken buttons.
- **Zod-schema protocol package shared between Go and TypeScript** (`packages/protocol`). ThinkGraph already has Zod schemas but they live in the app, not in a shared package with the worker. Worth noting as a refactor trigger if ThinkGraph ever ships a second worker type.
- **Non-intrusiveness as a design principle.** Adapters never rewrite the command. They only add env vars and parse stdout. Why a pi session still works standalone. ThinkGraph's equivalent restraint: don't mutate node state from the worker side except through the explicit `update-node` MCP tool.

#### Avoid list

- **Do not wrap ThinkGraph's Pi worker as a gmux session.** Tempting but wrong. ThinkGraph's worker needs Yjs presence, MCP tools, and structured dispatch context — gmux's adapter model is strictly output-parsing. Forcing Pi through gmux loses the conversation-context dispatch and stage-aware routing.
- **Do not adopt xterm.js as ThinkGraph's primary interaction surface.** gmux is terminal-first because its users steer at the CLI. ThinkGraph's `NodeChatPanel.vue` is strictly better for its purpose — structured interaction over a typed agent loop, not an opaque byte stream. A terminal panel would be a regression to the "raw transcript" failure mode.
- **Do not copy the "launch anything via `gmux <cmd>`" metaphor into ThinkGraph dispatch.** ThinkGraph nodes have pipeline stages, token budgets, and verdict gating. "Just run this command" skips all of that. Keep dispatch typed.
- **Do not build peer-linking / multi-machine aggregation.** gmux's multi-machine story is a natural fit for a local-dev tool. ThinkGraph is a Cloudflare-hosted multi-tenant web app — aggregation is solved by it *being* the server.
- **Avoid the "compiled-in adapter" pattern for dispatch services.** gmux compiles adapters into the Go binary because its distribution model is "brew install a single binary." ThinkGraph's 16 dispatch services should stay as hot-swappable TypeScript files because the app ships over Cloudflare Pages.

#### Verdict

**Raid for ideas — specifically the two-layer state discipline and the child-self-report pattern.** gmux is not a competitor; it's the process-supervisor layer that would sit *under* ThinkGraph's Pi worker if ThinkGraph ever dispatched to tools it doesn't own. The highest-value steal is #1 — gmux's `session-schema.md` is a crisply-stated version of the exact discipline that would close the still-open `useFlowSyncBridge` ephemeral-state bug. The second-highest is #2 — a generic `$GMUX_SOCKET`-style child status contract would cleanly unlock multi-provider dispatch. Not worth a deep fork, but worth keeping in a "watched_repos" row once Phase 2A's runner is fixed.

---

### 3.5 deer-flow (bytedance/deer-flow)

#### Critical framing correction

The original evaluation brief framed deer-flow as a LangGraph planner/researcher/coder/reporter pipeline. **That is v1**, frozen on the `1.x` branch. **v2 is a ground-up rewrite** with a completely different architecture. Any internal ThinkGraph notes citing "deer-flow planner → researcher → coder → reporter" are stale.

#### TL;DR

- **What it is (v2, as of Feb 2026):** A **super-agent harness**: one lead agent that dynamically spawns up to 3 concurrent sub-agents via a `task()` tool, with heavy middleware, sandboxes, and extensible skills.
- **Stack:** Python 3.12 + FastAPI + LangChain/LangGraph backend; Next.js 16 + React 19 + Tailwind 4 + Shadcn + LangGraph SDK + Vercel AI Elements frontend. Docker/K8s deploy. Heavy: 8 vCPU / 16 GB dev, 16 vCPU / 32 GB prod.
- **Core primitives:** `make_lead_agent` → 12 ordered middlewares → sandbox (`LocalSandboxProvider` or Docker `AioSandboxProvider`) → skills loaded from `skills/{public,custom}/**/SKILL.md` frontmatter → MCP via `MultiServerMCPClient` with OAuth → async memory extraction with confidence-scored facts.
- **Public skills shipped:** `research`, `report-generation`, `slide-creation`, `web-page`, `image-generation`. No podcast/TTS in v2 (that was v1).
- **License: MIT**, Bytedance Ltd. + DeerFlow Authors. Clean, safe to crib code-level.

#### Overlap with ThinkGraph

| Concern | ThinkGraph v2 | deer-flow 2.0 |
|---|---|---|
| Pipeline formalization | Step-based flexible pipeline with verdicts (APPROVE/REVISE/RETHINK/UNAVAILABLE) in `webhook.post.ts:1-450`; per-node `steps` array in `types.ts:37-53` | **No pipeline.** One lead agent plans on the fly via sub-agent spawning |
| Context assembly | `context-builder.ts` (553 lines) — 3 scopes, progressive disclosure, 12K budget | `SummarizationMiddleware` — aggressive context compression near token limits; filesystem offload for intermediate results |
| Conversation→dispatch | `dispatch-conversation.ts` (356 lines) — AI summarizes per-node chat into Goal/Decisions/Constraints/Open questions/Next steps, cached by hash | `MemoryMiddleware` async fact extraction with confidence scores + dedup; injects top 15 facts into `<memory>` tags |
| Tool scoping by role | Spec'd but **not shipped** — all 11 tools unscoped | Built-in: `SubagentExecutor` scopes tools per sub-agent spawn; `general-purpose` vs `bash` specialists |
| Human-in-the-loop | Per-node chat, canvas as first-class HITL surface | Two mechanisms only: `ClarificationMiddleware` (intercepts `ask_clarification` → `Command(goto=END)`) and `DanglingToolCallMiddleware` (recovers from interrupts). **No plan-editing UI** in v2 |
| State | D1 + Yjs, `thinkgraph_nodes` single source of truth | `ThreadState` extending LangGraph `AgentState`: `sandbox`, `thread_data`, `artifacts`, `todos`, `uploaded_files`, `viewed_images`, with custom reducers (`merge_artifacts`) |
| Worker execution | Pi worker HTTP dispatch via `pi-api.pmcp.dev` | `LocalSandboxProvider` singleton OR `AioSandboxProvider` Docker container; virtual path system maps `/mnt/user-data/{workspace,uploads,outputs}` |
| Artifacts layer | `store-artifact` MCP tool; per-node artifacts array | `core/artifacts/` in frontend, `artifacts` in ThreadState with dedup reducer |

**Critical asymmetry:** ThinkGraph is **canvas-first, node-centric, structure-as-memory**. deer-flow is **conversation-first, thread-centric, files-as-memory**. The originally-expected overlap (plan-then-execute-then-report) largely evaporated in v2.

#### Steal list

1. **Middleware chain pattern for the dispatch pipeline.** ⭐ deer-flow runs **14 ordered middlewares on the lead agent / 4 on subagents** per invocation. ⚠️ **Correction (second verification pass, 2026-04-08):** the original report said 12 and missed `ToolErrorHandling` and `LoopDetection`. The real ordered list (verified against `backend/docs/middleware-execution-flow.md`): `[0] ThreadData → [1] Uploads → [2] Sandbox → [3] DanglingToolCall → [4] Guardrail → [5] ToolErrorHandling → [6] Summarization → [7] Todo → [8] Title → [9] Memory → [10] ViewImage → [11] SubagentLimit → [12] LoopDetection → [13] Clarification`. **Per the onion model, list-position-13 (Clarification) runs FIRST in `after_model` reverse order — it has highest interception priority, not lowest.** ThinkGraph's `webhook.post.ts` (450 lines) is currently a tangle of per-verdict branching. A middleware chain would let you factor: verdict routing, token tracking, conversation-summary injection, stage-scoped tool selection, stuck-worker detection, **loop detection** (see new steal item #7 below), and tool-error recovery — all as composable units. **Cost: 2-3 days to refactor the webhook + `work-item.post.ts` into a middleware stack. High win.** This is the single pattern most worth lifting.
2. **`SKILL.md` with YAML frontmatter as formalization of pipeline steps.** ⚠️ **Source correction (second verification pass, 2026-04-08):** the original report claimed deer-flow's `SKILL.md` files have `name`, `description`, `license`, `allowed-tools` frontmatter. **That is wrong.** deer-flow's actual `skills/public/**/SKILL.md` files only have `name` + `description` (verified against `skills/public/deep-research/SKILL.md`, `skills/public/podcast-generation/SKILL.md`, `skills/public/skill-creator/SKILL.md`). There is no `custom/` sibling directory in the repo, only `public/`. The `allowed-tools` field is from a *different* spec — **Anthropic's Claude Code skills format** at `~/.claude/agents/*.md`, which is what agency-agents (75k stars) targets natively. **Recommendation rewrite:** adopt Claude Code's skills format directly, not deer-flow's thinner variant. You get (a) `allowed-tools` for stage-scoped MCP tools, (b) compatibility with `~/.claude/agents/*.md` so Pi worker prompts can be tested in Claude Code locally before dispatching, (c) free tooling support from the same harness that's reading this document, (d) ~75k stars worth of agency-agents examples to crib from, (e) a clean pairing with promptfoo's `trajectory:tool-used` assertions for runtime verification (see §3.3 steal item #7). Each step becomes `apps/thinkgraph/prompts/steps/{analyst,builder,reviewer,...}.md` with Claude Code's frontmatter schema. Solves the "stage-scoped MCP tools" gap structurally. **Cost:** low — schema + loader + swap the hardcoded `NODE_TYPE_STEPS` map in `types.ts:37-53`. 1-2 days. **The pattern is real and adoptable; the original report just attributed it to the wrong project.**
3. **`ClarificationMiddleware` intercepting `ask_clarification` tool calls with `Command(goto=END)`.** This is the HITL pattern ThinkGraph should copy for the reviewer's `UNAVAILABLE` verdict path. Currently `webhook.post.ts` handles UNAVAILABLE as "orange signal to human" — fine, but there's no clean structural mechanism for an in-flight agent to halt-and-ask. deer-flow's approach: agent emits a tool call, middleware rewrites it to a halt, state is preserved, user picks it up. Maps naturally onto ThinkGraph's per-node chat — the agent's "I need clarification" becomes a new assistant message in `NodeChatPanel.vue` and the pipeline pauses. **Cost: medium. ~3-4 days in the worker + webhook.**
4. **Async memory extraction with confidence scoring + dedup at apply time.** deer-flow's `MemoryMiddleware` debounces updates (30s), extracts facts with confidence scores, applies atomically (temp-file + rename) and skips duplicate fact content. ThinkGraph's `dispatch-conversation.ts` already hashes messages for cache invalidation, but produces a single monolithic brief each time, not structured facts. Lifting the fact-extraction-with-confidence model would improve dispatch summary quality and enable the "rolling summary" decision in `brief.md:203`. **Cost: medium. High-value because it's the exact pattern the assistant brief wants for Honcho-style "Representations."**
5. **Custom state reducers (`merge_artifacts`, `merge_viewed_images`).** ThinkGraph's `useFlowSyncBridge` currently overwrites Yjs ephemeral state on row refetches (open bug). deer-flow solves the analogous problem with LangGraph reducers that dedupe and merge. **The exact fix for the Yjs/row-refetch collision** — instead of the proposed "move to `node.ephemeral`" (option C in the audit), model it as a reducer that merges `row` + `ephemeral` writes instead of overwriting. **Cost:** low — scoped to `crouton-flow` (packages gate), same risk surface as option C. **Converges with gmux's steal #1.**
6. **Virtual path mapping for worker filesystem.** `/mnt/user-data/{workspace,uploads,outputs}` + `replace_virtual_path()` abstracts agent-visible paths from physical storage. ThinkGraph's Pi worker writes `.thinkgraph/nodes/{id}.md` via a TODO at `session-manager.ts:1437-1439`. A virtual-path layer would let the markdown-as-content-layer phase unify local dev, Pi worker, and future Nuxt Content output without hardcoding paths. **Cost:** low.
7. **`LoopDetectionMiddleware` for smarter REVISE-cap.** ⭐ Added in second verification pass (2026-04-08) — this middleware was missing from the original report's middleware list entirely. ThinkGraph's REVISE loop is currently capped at 3 iterations *count-based* (`webhook.post.ts:55-75` verdict handling). deer-flow's `LoopDetectionMiddleware` (position 12 in the chain) detects when the agent is making no real progress and breaks the loop on signal, not on count. Combined with promptfoo's `{pass, score, reason}` shape (priority item #8), you'd cap REVISE on score-non-improvement — exactly what the original brief flagged as the right direction but never implemented. **Cost:** 1-2 days, scoped to the verdict loop. Maps cleanly onto the middleware chain refactor (item #2) so they should ship together. Listed as priority item #13.
8. **`ToolErrorHandlingMiddleware` for graceful tool failure recovery.** Also missing from the original report's middleware list. deer-flow position 5 — handles tool execution errors before they propagate to the LLM and become a confused retry loop. ThinkGraph's MCP tools throw on error and rely on the worker to interpret the exception, which has been observed to produce unhelpful retry sequences. A dedicated middleware would catch, summarize, and rewrite errors into structured "tool failed because X, here's the recovery suggestion" messages. **Cost:** low; ships with the middleware chain refactor.

#### Learn list

- **v1→v2 rewrite as a signal.** deer-flow explicitly abandoned the discrete planner/researcher/coder/reporter roles for a lead-agent-plus-dynamic-subagents harness. Bytedance concluded the rigid multi-agent pipeline was less effective than one agent with good context management. **Direct warning to Phase 2C pipeline formalization: don't over-formalize.** ThinkGraph's current strength is that nodes can skip steps (`brief.md:170-172`) — keep that flexibility. Formalize the *step definitions* (skills), not the *sequences*.
- **"Skills loaded progressively — only when the task needs them."** Echoes ThinkGraph's progressive disclosure but applied to *tools/prompts*, not just content. Pi worker currently receives all 11 MCP tools regardless of stage. Progressive tool loading (lazy on first use) is worth understanding even if you don't copy the exact mechanism.
- **Memory-as-filesystem vs memory-as-graph.** deer-flow offloads intermediate results to the sandbox filesystem and compresses context. ThinkGraph's thesis is the inverse: the *graph* is the memory. Neither is wrong; deer-flow's choice is forced by having no canvas. **ThinkGraph should not adopt filesystem-as-memory** — it would undermine the canvas-is-memory thesis.
- **Sandboxes-as-first-class.** deer-flow treats sandbox lifecycle (`acquire/get/release`) as middleware. ThinkGraph's Pi worker is conceptually a remote sandbox but has no lifecycle abstraction. Worth understanding for the "worker outbox" work.

#### Avoid list

- **Do not adopt LangGraph.** It solves a problem ThinkGraph doesn't have (Python multi-agent state machines). ThinkGraph's state is D1 + Yjs, and the Cloudflare Workers runtime can't run LangGraph anyway. deer-flow needs LangGraph because it has no persistent canvas; ThinkGraph *is* the canvas.
- **Do not adopt the "super agent harness" thesis.** deer-flow 2.0 explicitly makes the lead agent the center of gravity. This is the **opposite** of ThinkGraph's canvas-first, human-in-the-loop, node-centric vision. It's also what v2 became *after abandoning* the planner/researcher/coder/reporter structure. **But do not conclude that v1's abandonment means ThinkGraph's pipeline is wrong.** It's a different problem: ThinkGraph's pipeline encodes *human judgment gates*, not agent-coordination logic.
- **Do not adopt Docker sandboxes.** 8 vCPU / 16 GB dev requirements are incompatible with Cloudflare Workers + Pi 5 worker stack. Pi-as-sandbox is already the right call.
- **Do not build podcast/TTS/PPT generation.** Those were v1 features that v2 dropped. Bytedance's own product team concluded they weren't core.
- **Do not adopt the confidence-scored-facts memory model wholesale.** Tempting from steal #4, but beware: deer-flow's facts accumulate forever with dedup; ThinkGraph's equivalent should be *scoped to a node's conversation*, not a global user memory. Lift the *mechanism*, not the *scope*.
- **Do not confuse v1 with v2.** Any blog post, tutorial, or internal note referencing v1's pipeline is outdated and shares no code with v2.

#### Verdict

**Raid for ideas, adopt 2-3 specific patterns, then ignore.** Architecturally orthogonal to ThinkGraph — solves agent orchestration without a canvas. The original brief's framing (compare pipelines, HITL plan-editing, research-report outputs) was calibrated against v1 deer-flow, which no longer exists. In v2, the thesis divergence is large enough that wholesale adoption would undo ThinkGraph's core differentiation. But three specific pieces are worth lifting: the **middleware chain** pattern for `webhook.post.ts`, the **`SKILL.md` YAML frontmatter** format for Phase 2C pipeline formalization, and the **`ClarificationMiddleware` halt-and-ask** pattern for the UNAVAILABLE reviewer verdict. MIT license makes all of this safe to crib code-level. **Total investment: ~1 week of focused refactor work for a meaningful structural improvement.**

---

## 4. Consolidated priority ranking

Duplicated from Section 1 for reviewer convenience. Ranked by ROI (value ÷ effort), with notes on cross-project convergence.

| Rank | Action | Effort | Source | Converges |
|---|---|---|---|---|
| **1** | Adopt **promptfoo** as dev-only eval harness for 6 pure prompts | ½ day | promptfoo | — |
| **2** | **Middleware chain** refactor of `webhook.post.ts` | 2-3 days | deer-flow | — |
| **3** | **Two-layer state discipline / custom reducers** to fix `useFlowSyncBridge` bug | scoped | gmux + deer-flow | ✅ two independent sources |
| **4** | **Claude Code skills format** for pipeline step definitions | 1-2 days | Anthropic Claude Code skills spec | ✅ agency-agents (75k stars); source corrected in 2nd verification pass |
| **5** | **`ClarificationMiddleware`** halt-and-ask for UNAVAILABLE verdict | 3-4 days | deer-flow | — |
| **6** | **Directory-recursive retrieval** via `parentId` on Vectorize | 1 day | OpenViking | — |
| **7** | Persist **retrieval trajectory** as `context-trace` artifact | ½ day | OpenViking | — |
| **8** | **`{pass, score, reason}`** shape for reviewer verdict | low | promptfoo | — |
| **9** | **Child self-report HTTP socket** for future non-Pi dispatch | medium | gmux | — |
| **10** | **Triage-first sort** in `NodeAgentActivity.vue` | trivial | gmux | — |
| **11** | **Scrollback ring buffer** — cap `agentLog` at ~128KB | low | gmux | — |
| **12** | **Thin `thinkgraph` CLI** wrapping existing MCP tools | 1-2 days | OpenViking | — |
| **13** | **`LoopDetectionMiddleware`** — score-based REVISE cap | 1-2 days | deer-flow (2nd verification pass) | ✅ pairs with #2 + #8 |
| **14** | **Capability probes** for 16 dispatch services | ½ day | gmux × dispatch audit (2nd verification pass) | — |
| **15** | **promptfoo `trajectory:*` assertions** for stage-scoped tool enforcement | included in #1 | promptfoo (2nd verification pass) | ✅ pairs with #4 |

### Items that converge across multiple projects (signal amplification)

- **State discipline (item 3).** Both gmux (runner-authoritative vs daemon-cache) and deer-flow (custom reducers) independently arrive at "keep process-state and app-state separate, merge don't overwrite." This is the strongest cross-project signal in the report and points directly at the open `useFlowSyncBridge` bug.
- **Role prompt formalization (item 4).** agency-agents demonstrates the template idea with 144 examples; deer-flow validates it with a production loader and `allowed-tools` frontmatter. Adopt deer-flow's schema, not agency-agents' bespoke frontmatter fields.
- **"Prompts ship; infrastructure rots" principle.** Both agency-agents (144 prompts, zero infra) and deer-flow (skills directory) center on prompt+metadata-as-artifact. ThinkGraph's dormant 15 dispatch services are the counter-example. Lesson: systematize step prompts before adding more dispatch services.

---

## 5. Cross-cutting themes

### Theme 1: ThinkGraph's open gaps have external answers

Five of the eight known-open-gaps in Section 2 have direct patterns from the external projects:

| Open gap | External answer |
|---|---|
| Stage-scoped MCP tools (unshipped Phase 1) | deer-flow `SKILL.md` `allowed-tools` frontmatter |
| Source-node references in dialectic | OpenViking retrieval trajectory visualization |
| `useFlowSyncBridge` ephemeral-state overwrite | gmux two-layer state + deer-flow custom reducers |
| Zero tests on 6 load-bearing prompts | promptfoo eval harness |
| Phase 2C pipeline formalization | deer-flow `SKILL.md` format + promptfoo assertion vocabulary |

**Interpretation:** the research was productive. These aren't speculative improvements — they're direct solutions to problems already documented in the ThinkGraph briefs.

### Theme 2: ThinkGraph's *thesis* is validated, not challenged

Every external project is either:
- **Architecturally orthogonal** (gmux = process supervisor, promptfoo = eval tool)
- **Solving the opposite problem** (OpenViking = agent-populated store, deer-flow v2 = super-agent harness)
- **Structurally thinner** (agency-agents = stateless catalog)

**None of them has a better answer to "canvas-first, node-centric, human-in-the-loop, AI as peer."** That is ThinkGraph's unique position. The raid recommendations are structural improvements *within* that thesis, not pivots away from it.

### Theme 3: The "don't over-formalize" warning — but applied to the right problem class

deer-flow's v1→v2 rewrite is one of the most important data points in this report, but it must be applied carefully. Bytedance deprecated a rigid planner/researcher/coder/reporter pipeline in favor of a flexible lead-agent harness. **The lesson is narrower than it sounds:** rigid *agent-coordination* pipelines (where each role is an autonomous agent passing state to the next) lose to flexible harnesses with one lead agent and dynamic sub-agents.

**ThinkGraph's pipeline is a different problem class.** It encodes *human-judgment gates* (analyst evaluates, reviewer verdicts as control flow, UNAVAILABLE → orange signal to human), not agent coordination. The verdicts exist to give humans decision points, not to coordinate autonomous agents. v1 deer-flow had no human in the loop; ThinkGraph's pipeline is *built around* the human in the loop.

**The correct read for Phase 2C:**
- ✅ Formalize *step definitions* (prompts, allowed-tools, validators) — that's the `SKILL.md` steal.
- ✅ Keep the per-node `steps` array configurable — never hardcode sequences in the schema.
- ❌ Don't conclude that the pipeline itself is wrong. The HITL framing protects ThinkGraph from v1 deer-flow's failure mode.

### Theme 4: License landscape

| Project | License | Can crib code? |
|---|---|---|
| OpenViking | AGPLv3 | ❌ Ideas only |
| agency-agents | (markdown library) | ✅ Content reusable |
| promptfoo | MIT | ✅ Safe dev dep |
| gmux | MIT | ✅ Safe to crib |
| deer-flow | MIT | ✅ Safe to crib |

Only OpenViking is license-blocked. Everything else in the steal list can be lifted code-level.

### Theme 5: What ThinkGraph is *not* missing

Reviewer sanity check — things the external projects have that ThinkGraph deliberately should not adopt:

- **VikingBot / super-agent harness / "lead agent plans everything"** → ThinkGraph's pipeline is a human-judgment gate, not an agent-coordination mechanism
- **LangGraph** → Cloudflare Workers can't run it; D1+Yjs is the state model
- **Filesystem-as-memory** → graph-as-memory is the thesis
- **Docker sandboxes** → Pi-as-sandbox is right for this stack
- **Terminal UI (xterm.js)** → `NodeChatPanel.vue` is structurally better
- **Multi-machine peer-linking** → being a Cloudflare web app already solves this
- **Global user memory / confidence-scored user facts** → per-node Honcho Representations is the decided direction
- **Podcast/TTS/PPT generation** → even deer-flow dropped these in v2

---

## 6. Open questions for the evaluating agent

These are the places where a reviewing agent or human should pressure-test the recommendations before committing to implementation:

1. **Is the middleware refactor (item 2) worth 2-3 days right now, or should it wait for Phase 2C?**
   The refactor cleanly unlocks stage-scoped tools, which is Phase 1 work. But it touches `webhook.post.ts` heavily and could conflict with any in-flight dispatch changes. **Question:** what's the current state of `webhook.post.ts` ownership?

2. **Does the promptfoo adoption (item 1) conflict with any existing Vitest strategy?**
   The project has no tests at all in `apps/thinkgraph`, but `pnpm test:unit` exists at root — check whether there's a Vitest preference and whether promptfoo can live alongside it without ceremony.

3. **Is the `useFlowSyncBridge` fix (item 3) blocked on package-gate approval?**
   CLAUDE.md's `packages/` boundary is a hard gate. Item 3 touches `packages/crouton-flow/`. **Question:** is the user ready to unblock this, or should the fix wait?

4. **Should the `SKILL.md` format (item 4) be implemented before or after the middleware chain (item 2)?**
   Middleware chain without `SKILL.md` gives composability without step-definition portability. `SKILL.md` without middleware chain gives portable prompts still routed through tangled per-verdict branching. **Recommendation from this report:** middleware first, then `SKILL.md` — but validate with a reviewer who knows the current webhook state.

5. **What's the current state of `context-builder.ts` (the OpenViking raid targets it twice)?**
   Items 6 (directory-recursive retrieval) and 7 (retrieval trajectory) both assume `context-builder.ts` is stable and extensible. If it's in flux, defer these.
   **Verified 2026-04-08:** `context-builder.ts` has no uncommitted changes; most recent commit is `6aa06e7e` (fan-in connections, synthesize/analyse steps). Stable enough to extend. Items 6 and 7 are not blocked.

6. **Is there a safer way to get promptfoo's red-team coverage before Pi dispatch is multi-tenant?**
   Running promptfoo against a staging Pi endpoint requires a staging Pi endpoint. **Question:** does one exist, and if not, is red-team coverage worth setting one up?

7. **Does the "don't over-formalize sequences" warning (Theme 3) require any edits to the Phase 2C brief?**
   The current brief *may* already have this right — but it's worth a re-read to confirm that `pipeline_steps` formalizes step definitions, not fixed orderings.

8. **Are any of the 15 dormant dispatch services in line to be consolidated with the child-self-report pattern (item 9)?**
   `dispatch-services-audit.md` should drive this. **Question:** is the audit current?

9. **Is there appetite for a `thinkgraph` CLI (item 12)?**
   Low priority but high debugging value. **Question:** is the team comfortable adding a new package, or should this wait until after the higher-priority items ship?

---

## 7. Research methodology (for reproducibility)

- **5 parallel general-purpose subagents**, one per project. Each ran in isolation — no shared context — so the evaluations are independent.
- **Each subagent was instructed to read the ThinkGraph briefs and codebase *first*** before fetching the external project. This prevents "framing lock-in" from the external project's marketing.
- **Each subagent produced the same 6-section report shape** (TL;DR → Overlap → Steal → Learn → Avoid → Verdict) to make cross-comparison mechanical.
- **WebFetch was used** for external project READMEs and key documentation. No external code was cloned or executed.
- **Reports were capped at ~1200 words each** to force opinionated prioritization over exhaustive coverage.
- **No code changes were made.** This is research only.
- **The deer-flow evaluation surfaced a v1/v2 framing correction** that invalidates any internal ThinkGraph notes written against v1's pipeline architecture.

### ThinkGraph files read (by one or more subagents)

- `docs/projects/thinkgraph-v2/README.md`
- `docs/projects/thinkgraph-v2/brief.md`
- `docs/projects/thinkgraph-v2/thinkgraph-assistant-brief.md`
- `docs/projects/thinkgraph-v2/thinkgraph-convergence-brief.md`
- `apps/thinkgraph/server/api/teams/[id]/dispatch/webhook.post.ts`
- `apps/thinkgraph/server/api/teams/[id]/dispatch/work-item.post.ts`
- `apps/thinkgraph/server/utils/context-builder.ts`
- `apps/thinkgraph/server/utils/dispatch-conversation.ts`
- `apps/thinkgraph/server/utils/summary-generator.ts`
- `apps/thinkgraph/server/utils/question-extractor.ts`
- `apps/thinkgraph/server/utils/template-detector.ts`
- `apps/thinkgraph/server/utils/validate-graph.ts`
- `apps/thinkgraph/server/api/teams/[id]/thinkgraph-nodes/search-similar.post.ts`
- `apps/thinkgraph/server/mcp/tools/*.ts` (11 tools)
- `apps/thinkgraph/layers/thinkgraph/collections/nodes/types.ts`
- `apps/thinkgraph/app/components/NodeChatPanel.vue`
- `apps/thinkgraph/app/components/NodeAgentActivity.vue`
- `apps/thinkgraph-worker/src/session-manager.ts`
- `apps/thinkgraph-worker/src/yjs-pool.ts`
- `packages/crouton-flow/app/composables/useFlowSyncBridge.ts`

### External projects fetched

- https://github.com/volcengine/OpenViking
- https://github.com/msitarzewski/agency-agents
- https://github.com/promptfoo/promptfoo
- https://github.com/gmuxapp/gmux
- https://github.com/bytedance/deer-flow

---

## 8. Revision log

**2026-04-08 (later same day) — Second verification pass (Claude Opus 4.6, 1M context)**

Re-checked the load-bearing technical claims in §3.3 (promptfoo) and §3.5 (deer-flow) against live source. Three corrections + four additions surfaced; all applied in-place with `⚠️ Correction` / `⭐ Added in second verification pass` markers preserved at the edit sites.

### Corrections applied

| Claim | Status | Edit location |
|---|---|---|
| deer-flow runs 12 ordered middlewares | ❌ **14 on lead agent / 4 on subagents.** Missing `ToolErrorHandling` (pos 5) and `LoopDetection` (pos 12). Real list verified against `backend/docs/middleware-execution-flow.md` | §3.5 steal #1 |
| Clarification middleware sits late in the chain (lowest priority) | ❌ **Position 13 (last in list) → runs FIRST in `after_model` reverse order under the onion model — highest interception priority, not lowest** | §3.5 steal #1 |
| deer-flow `SKILL.md` frontmatter has `name`, `description`, `license`, `allowed-tools` | ❌ **Wrong.** Real deer-flow `skills/public/**/SKILL.md` has only `name` + `description`. `allowed-tools` is from **Anthropic's Claude Code skills format**, not deer-flow. No `custom/` sibling directory exists. | §3.5 steal #2, §1 top-line, §1 priority table item #4, §4 priority table item #4 |
| promptfoo "owned by `promptfoo` org, not OpenAI" (per first verification pass revision log entry below) | ❌ **The first revision was wrong.** Live README states verbatim: *"Promptfoo is now part of OpenAI. Promptfoo remains open source and MIT licensed."* Net effect on the recommendation: longevity risk *drops*, dev-only adoption is *more* attractive. | §3.3 TL;DR |

### Additions applied

| Item | Where added | Why it was missing |
|---|---|---|
| **promptfoo `trajectory:*` assertion family** (`trajectory:tool-used`, `trajectory:tool-args-match`, `trajectory:tool-sequence`, `trajectory:step-count`, `trajectory:goal-success`, `skill-used`, `guardrails`) | §3.3 steal item #7 + §1 priority table row 15 | Original report's assertion list undersells promptfoo's breadth. The trajectory family is **the missing test layer for stage-scoped MCP tools** — connects items #1 and #4 into a single coherent test strategy: Claude Code skills declare `allowed-tools`, promptfoo trajectory assertions verify them at runtime. |
| **Anthropic Claude Code skills format as the actual source for `allowed-tools`** | §3.5 steal #2 (rewrite) + §1 top-line + §1 priority table item #4 + §4 priority table item #4 | Replaces the misattributed deer-flow source. Adopting Claude Code's format gets you (a) `~/.claude/agents/*.md` compatibility, (b) free tooling support from the harness reading this document, (c) ~75k stars of agency-agents examples. |
| **`LoopDetectionMiddleware`** as its own steal item — score-based REVISE cap | §3.5 steal #7 + §1/§4 priority table row 13 | Was hidden inside the missing-from-original middleware list. Smarter than the count-based 3-iteration cap currently in `webhook.post.ts:55-75`. Maps cleanly onto a middleware chain refactor (item #2). |
| **`ToolErrorHandlingMiddleware`** as a related steal | §3.5 steal #8 | Same root cause as LoopDetection — both were missing from the original middleware list. Position 5 in the real chain. Catches tool execution errors before they propagate to the LLM and produce confused retry sequences. |
| **Capability probes for the 16 dispatch services** via gmux's `Discover()` pattern | §3.4 steal #6 + §1/§4 priority table row 14 | Original report had this in the gmux Learn list but never elevated it to a priority action item. Connects the dispatch-services audit (`dispatch-services-audit.md`) to a concrete UI gate. |

### Net effect on the priority ranking

- **Priority table grows from 12 to 15 items.** New rows: 13 (LoopDetection), 14 (Capability probes), 15 (trajectory assertions, bundled into #1's setup cost).
- **Item #4's source attribution flips** from "deer-flow" to "Anthropic Claude Code skills spec." The pattern is real and adoptable; only the source citation was wrong.
- **No item is demoted or removed.** The five projects' relative rankings hold. The corrections concentrate in implementation detail, not in which projects are worth raiding.
- **Strongest cross-project signal (item #3) is unaffected** — the gmux + deer-flow convergence on state discipline survives review unchanged.

### What this verification pass did not re-check

- **Items 6, 7, 9-12** in the priority table — OpenViking + gmux + agency-agents specifics were already independently verified in the first pass.
- **`useFlowSyncBridge.ts:124-129`** open bug (item #3) — code state has not changed since the first pass and the recommendation stands.
- **The eight known open gaps** in §2 — the report's mapping of gaps to external answers in Theme 1 is updated only for the SKILL.md row (now reads "Anthropic Claude Code skills format `allowed-tools` frontmatter + promptfoo `trajectory:*` assertions for runtime verification").
- **Worker outbox / durability layer (gap #4)** remains unaddressed by any of the five projects. A future evaluation pass against Inngest / Trigger.dev / Cloudflare Queues / Durable Objects patterns would close this — flagged here for the next iteration, not actioned.

---

**2026-04-08 — Independent verification pass (Claude Opus 4.6)**

Re-checked the report's load-bearing factual claims via `gh api` against current GitHub state. Findings:

| Claim | Status | Action |
|---|---|---|
| OpenViking is AGPLv3, Python+Go+C++ | ✅ Verified | — |
| agency-agents is a "144-file markdown library" | ✅ Verified — but undersold: 75.1k stars (3.7× promptfoo) | Added stars to project table |
| promptfoo is "now owned by OpenAI" | ❌ **Wrong.** Owned by `promptfoo` org (own startup); used *by* OpenAI/Anthropic per their own README | Corrected in §3.3 TL;DR |
| gmux is MIT, Go, ~42 stars | ✅ Verified | — |
| deer-flow v2 is a ground-up rewrite, shares no code with v1 | ✅ **Strongly verified.** README literally says so; `main-1.x` branch exists | Strengthened Theme 3 framing |
| `context-builder.ts` may be "in flux" (open Q #5) | ✅ Resolved: stable. No uncommitted changes; last touched in committed feat work (`6aa06e7e`) | Items 6, 7 unblocked |

**Prioritization disagreement:** The original report ranks promptfoo adoption #1. After independent review, **item 3 (state discipline / custom reducers)** is the highest-conviction recommendation because (a) two independent projects converge on the same pattern and (b) it directly closes a known open bug at `useFlowSyncBridge.ts:124-129`. promptfoo prevents *future* regressions; item 3 fixes a *current* bug. Recommendation table order kept (effort-based ranking) but top-line summary updated to call this out.

---

*End of report.*
