# ThinkGraph v2 — Docs Index

Read these in order. The first three describe the design; the fourth is operational; the fifth is research only.

| # | Doc | What it is |
|---|-----|------------|
| 1 | [brief.md](brief.md) | The v2 design — node model, pipeline, context assembly, build phases. **Has a "Status as of 2026-04-07" section at the top** showing what shipped vs. what's still pending. |
| 2 | [thinkgraph-convergence-brief.md](thinkgraph-convergence-brief.md) | The 2026-04-03 build plan that absorbed lessons from spec-kit, MDC, lat.md, etc. Phases 1A and 1C shipped; 1B and Phase 2 are still pending. |
| 3 | [thinkgraph-assistant-brief.md](thinkgraph-assistant-brief.md) | The assistant-as-graph-peer brief. Step 1 (per-node chat) shipped — see status section in `brief.md` for the actual implementation choice. |
| 4 | [implementation-notes.md](implementation-notes.md) | Operational knowledge: proven patterns, known bugs, deployment specifics, useMetadata investigation. |
| 5 | [external-research-2026-04-07.md](external-research-2026-04-07.md) | ⚠️ **Research only — not on the build queue.** Six external projects evaluated, three workflow proposals, one hardware decision. The "not building" banner inside the doc stays. Don't mistake this for a roadmap. |

## TL;DR for someone landing here cold

- **Shipped:** Phase 0 (unified node model), Phase 1A (MDC rendering), Phase 1C (wiki-links + backlinks), Assistant Step 1 (per-node chat via `chatconversations`).
- **Not started:** Phase 1B (graph validation), Phase 2A (repo watchlist), Phase 2B (semantic search/Vectorize), Phase 2C (pipeline formalization), Assistant Steps 2–4.
- **Open cleanup debt:** legacy `decisions/` and `workitems/` collection folders still on disk with live consumers in `apps/thinkgraph/server/api/teams/[id]/thinkgraph-decisions/`. See the status section in `brief.md` for details.