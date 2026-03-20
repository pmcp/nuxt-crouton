# ThinkGraph Session Learnings — 2026-03-20

## What was built

### Pipeline MVP
- `stage` and `signal` fields on work items (schema, DB, API, composable)
- Traffic light UI on node cards — 4-dot pipeline indicator (A B R M) with state-based styling
- Analyst gate in session-manager: validates brief before real work starts
- Green auto-advance: webhook detects green signal → re-queues same item at next stage
- Orange pause: questions surfaced, item waits for human
- Red block: work shouldn't be done
- Builder stage: delegates to existing type-specific instructions
- Reviewer stage: code review and quality gate
- Merger stage: merge branch into main, resolve conflicts, squash-merge PR
- pm-tools `update_workitem` extended with `stage`, `signal`, `assignee` params

### Canvas cleanup
- Deleted 55 stale items (all done + queued review learnings)
- 12 actionable queued items remain

---

## Key learnings

### Analyst executes instead of evaluating
First test: dispatched "Clean up legacy decision references" (a task that SHOULD be flagged red — decisions collection is the legacy thinking graph, not dead code). The analyst partially attempted the work instead of just evaluating the brief and signaling.

**Root cause:** Analyst instructions say "evaluate" but don't explicitly say "do NOT modify any files or run any commands." Pi interprets the brief as actionable context and starts working.

**Fix needed:** Add explicit constraints to `analystInstructions()`:
- "You are an evaluator, not an executor"
- "Do NOT create files, modify code, or run shell commands"
- "Your ONLY output is a signal (green/orange/red) via update_workitem"

### Migration file picks up stale schema changes
`npx nuxt db generate` picked up chatconversations `createdAt`/`updatedAt` columns that were already applied, causing `SQLITE_ERROR: duplicate column name: createdAt`. Had to manually edit the migration SQL.

**Root cause:** Drizzle generates migrations by diffing schema.ts against the migration history snapshot. If a prior migration was applied manually (or the snapshot is out of sync), it re-generates the same ALTER TABLE.

**Workaround:** Always review generated migration SQL before applying. Remove duplicate ALTER TABLE statements.

### decisions vs workitems confusion persists
The canvas had a work item to "replace thinkgraphDecisions with thinkgraphWorkItems" — but `decisions` is the thinking graph canvas collection, `workitems` is the PM pipeline. They coexist. This confusion will keep recurring until we rename or clearly document the distinction.

**Clarification:**
- `thinkgraphDecisions` = nodes on the thinking canvas (legacy exploration mode)
- `thinkgraphWorkItems` = PM pipeline work items (dispatched to Pi)
- MCP tools (`create-node`, `update-node`, `store-artifact`) correctly use decisions — they operate on the canvas

---

## Friction points

1. **Analyst needs guardrails** — Current prompt doesn't prevent the analyst from doing actual work. Needs explicit "evaluate only" constraints.

2. **Pipeline dot visibility** — Pipeline lights only show when `stage` is set. Items dispatched before this feature have no stage — they need migration or the dispatch endpoint must always set stage.

3. **Webhook stage progression depends on sendCallback reading work item state** — If Pi sets signal but the GET request fails, stage won't advance. Fragile coupling.

---

## Ideas for next session

- Tighten analyst prompt: evaluate-only, no file modifications
- Add "re-dispatch" button for orange items (human answers question → re-dispatch same stage)
- Stage history in artifacts array (track all signals over time)
- Bulk dispatch with pipeline awareness (respect maxSessions, queue intelligently)
