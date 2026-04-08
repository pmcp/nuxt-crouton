# ThinkGraph v2 — Docs Index

Read these in order. The first three describe the design; the fourth is operational; the fifth is research only.

| # | Doc | What it is |
|---|-----|------------|
| 1 | [brief.md](brief.md) | The v2 design — node model, pipeline, context assembly, build phases. **Has a "Status as of 2026-04-07" section at the top** showing what shipped vs. what's still pending. |
| 2 | [thinkgraph-convergence-brief.md](thinkgraph-convergence-brief.md) | The 2026-04-03 build plan that absorbed lessons from spec-kit, MDC, lat.md, etc. Phases 1A and 1C shipped; 1B and Phase 2 are still pending. |
| 3 | [thinkgraph-assistant-brief.md](thinkgraph-assistant-brief.md) | The assistant-as-graph-peer brief. Step 1 (per-node chat) shipped — see status section in `brief.md` for the actual implementation choice. |
| 4 | [implementation-notes.md](implementation-notes.md) | Operational knowledge: proven patterns, known bugs, deployment specifics, useMetadata investigation. |
| 5 | [external-research-2026-04-07.md](external-research-2026-04-07.md) | ⚠️ **Research only — not on the build queue.** Six external projects evaluated, three workflow proposals, one hardware decision. The "not building" banner inside the doc stays. Don't mistake this for a roadmap. |

## TL;DR for someone landing here cold (re-audited 2026-04-07 PM)

- **Shipped end-to-end:** Phase 0 (unified node model + cleanup), Phase 1B (graph validation incl. `stuck-worker` for Pi-stranded nodes), Phase 2B (Vectorize semantic search infra), Phase 3 (fan-in / synthesis), Assistant Step 1 storage+UI.
- **Partial — infra shipped, integration missing:** Phase 1A (MDC renders, no custom components, services don't emit MDC), Phase 1C (wiki-link parser/validator exists, not wired to save flow, no clickable rendering), Phase 2A (collections + cron + runner exist but **D1 migration was never generated** — runner is dead code in any environment until that's fixed; also no canvas inbox UI, legacy `sync-changelogs` not removed), Phase 1 of v2 brief (structured verdicts + skippable steps shipped, stage-scoped MCP tools missing), Phase 2 of v2 brief (markdown built but worker git-commit step is a TODO), Step 2 (Phase 2B unblocks it but no dialectic endpoint), Step 3 (Yjs client/pool/agent-log all live; **no UI renders them** — biggest visual win for smallest effort).
- **Critical gap not in any phase:** dispatch flow does **not** include conversation history when sending nodes to Pi. Decision #2 of the assistant brief was implicitly answered "no." This breaks the load-bearing premise of the per-node-chat feature.
- **Not started:** Phase 2C (pipeline formalization), Phase 4 meeting/transcript flow, Phase 5 Nuxt Content, Step 4 (background reflection), Pi worker durability outbox.
- **Cleanup status:** Phase 0 fully complete (commit `b10beff6`). `research-agent` removed. **Still open:** legacy DB tables (`thinkgraph_decisions`/`thinkgraph_workitems`) physically in D1, 2 orphaned migration files, 15 dormant dispatch services, `sync-changelogs` parallel to Phase 2A runner. See `brief.md` status section for the full list.