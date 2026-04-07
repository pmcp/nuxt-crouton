# ThinkGraph v2 — Implementation Notes

Operational knowledge carried forward from v1. These are proven patterns, known bugs, and deployment details that the brief intentionally doesn't cover.

---

## Proven Patterns (carry forward)

### Session Cleanup Order

`activeSessions.delete()` MUST happen BEFORE `sendCallback()`. Otherwise auto-dispatch from webhook hits "Session already running." Hard-won race condition fix.

### Webhook Reads Signal from DB

The webhook reads the work item's signal directly from SQLite — not from the worker's callback body. Worker sets signal via `update_workitem` tool during the session. Webhook reads it after. More reliable than forwarding signal through HTTP.

### Auto-Advance Rules

Only pi-assigned items auto-dispatch on green signal. Human/client items wait for triage. This prevents the system from spiraling into autonomous execution when human review is expected.

### Orange Q&A UX

When a step signals orange, the detail panel parses numbered questions (1., Q1:, ### Q1:, **1.**) into individual cards with input fields. Human answers are formatted as Q&A pairs and appended to the brief. "Respond & Re-dispatch" button re-runs the same step with the enriched brief.

### Structured Learnings Format

Pi submits learnings as a typed array via `update_workitem`:

```json
{
  "learnings": [
    { "text": "Discover skill should detect existing briefs", "scope": "skill" },
    { "text": "Missing schemas for custom collections", "scope": "process" }
  ]
}
```

Scope values: `skill`, `tool`, `prompt`, `infra`, `process`. Each learning becomes a child node for human triage. In v2, actionable learnings targeting ThinkGraph should be flagged as meta nodes.

### Child Node Taxonomy

Work items can spawn children of different kinds, each with different triage behavior:

| Kind | What it is | Triage action |
|------|-----------|---------------|
| **Learning** | Process improvement insight | Promote to task, dismiss, or flag as meta |
| **Opportunity** | Out-of-scope but valuable idea | Park for later or promote |
| **Chunked task** | Parent was too big, broken down | Auto-queue for dispatch |
| **Question** | Needs human input before continuing | Answer inline, re-dispatch parent |

### Retrospective Footer

`session-manager.ts` `retrospectiveFooter()` appends reflection instructions to every dispatch. Known to be a "kitchen sink" — should be split into composable instruction blocks per step type in v2.

---

## Known Bugs & Gotchas

### useMetadata: false CLI Bug

The crouton-cli generator creates `createdAt`/`updatedAt` NOT NULL columns in DB migrations but doesn't add them to the drizzle schema when `useMetadata: false`. Causes insert failures. Hit twice (chatconversations and workitems).

**Investigation 2026-04-07 (do not patch packages/ until confirmed in a fresh repro):**

Audited the cli generators directly. The schema generator at `packages/crouton-cli/lib/generators/database-schema.ts:216` already gates `createdAt`/`updatedAt`/`createdBy`/`updatedBy` on `useMetadata` — when `false`, the metadata block is empty and nothing is emitted into the drizzle TS schema. `database-queries.ts:277,542` and `api-endpoints.ts:54,105` also gate every reference to those columns on the same flag. There is no code path in the cli that writes its own `.sql` migration file: `generate-collection.ts:394` shells out to `npx nuxt db generate` and lets drizzle-kit produce the SQL from the schema diff.

So **the bug is not in the schema/queries/api generators as currently written.** Three remaining suspects, ordered by likelihood:

1. **Stale drizzle-kit snapshots in `apps/thinkgraph/server/db/migrations/sqlite/meta/`.** drizzle-kit diffs the new schema against the previous snapshot. If a collection was first generated when `useMetadata: true` (or was hand-edited at some point) and then re-generated with `useMetadata: false`, the snapshot still records the columns as `notNull: true`. Confirmed for `thinkgraph_chatconversations` in `meta/0012_snapshot.json:1710` — `createdAt` is `notNull: true` in the snapshot AND the live schema (`apps/thinkgraph/layers/thinkgraph/collections/chatconversations/server/database/schema.ts:40-41`) also has `.notNull().$default(...)`. So the live `chatconversations` collection is *not currently broken*: someone (the generator on an earlier flag setting, or a hand edit) supplied the columns. The bug as described would manifest only if someone re-generated the collection today and accepted whatever drizzle-kit produced.

2. **Duplicate/orphan SQL migration files** (see "Migration Filename Collisions" below). The orphan files were never journaled but they're still on disk and could mislead anyone diffing migration history.

3. **Drizzle-kit producing a CREATE TABLE with `notNull` for legacy non-metadata columns** that happen to be named `createdAt`/`updatedAt`. Unlikely but worth confirming.

**Recommended next step (next session):**
- Reproduce in a throwaway dir: `crouton init test-app && cd test-app`, add a single collection with `useMetadata: false`, run `pnpm crouton config` and `pnpm db:generate`. Inspect the generated `.sql` and compare against the drizzle TS schema. If they agree, the bug is fully a snapshot-drift issue and the fix is "blow away `meta/` and let drizzle-kit re-snapshot from the current schema." If they disagree, the root cause is in `database-schema.ts` after all and requires a code fix scoped to the metadata block.
- Either way, the fix lives in `packages/crouton-cli/` (or in the thinkgraph snapshots), not in the consuming app — so wait for explicit `packages/` approval before patching.

### Migration Filename Collisions (2026-04-07)

`apps/thinkgraph/server/db/migrations/sqlite/` contains two pairs of files at the same migration number:

- `0004_add_pinned.sql` — journaled at `idx: 4` in `meta/_journal.json`. Adds `pinned` column to `thinkgraph_decisions`.
- `0004_first_ironclad.sql` — **NOT in the journal.** Creates `thinkgraph_graphs`, adds `graphId` to `thinkgraph_decisions`, drops audit columns from `thinkgraph_chatconversations`.
- `0009_add_user_role.sql` — **NOT in the journal.** Adds `role` column to `user`.
- `0009_grey_bruce_banner.sql` — journaled at `idx: 9`. Creates `thinkgraph_projects` and `thinkgraph_workitems`, adds `notion_settings` to `team_settings`, AND adds `role` to `user`.

The original audit task assumed both files in each pair were journaled and could be safely renumbered. They are not — only one of each pair is journaled, and the other is an **orphan SQL file that the drizzle migrator never executes**.

**What this means in practice:**
- On a fresh local DB (`pnpm db:migrate`), only the journaled files run. Apply order is well-defined; there is no "undefined order" risk in production.
- The orphan files are dead code at the SQL level, but they confused the human auditor and they reference `thinkgraph_decisions` (the legacy collection that Phase 0 replaced).
- The `thinkgraph_graphs` table that `0004_first_ironclad.sql` would create *is* present in snapshot `0005_snapshot.json` and beyond, so historically the file was applied to some database somewhere — likely an older deploy where it was journaled, before the journal was rewritten.

**Why I did not delete or renumber the orphan files in this pass:**
- The task's renumbering procedure assumed the files were journaled. For orphans, renumbering is meaningless — the journal does not reference them, so renaming changes nothing.
- Deleting them is *probably* safe (no current execution path), but the fact that `thinkgraph_graphs` exists in production via a non-current journal entry suggests history has been mutated before and there may be deployed environments whose journal state differs from what's in git. Deleting the orphan SQL would prevent any future "re-add to journal" recovery path.
- This is the "Migration Snapshot Drift" gotcha referenced earlier in this file, biting us at the file level instead of the column level.

**Recommended next step:**
1. Verify production D1 journal state matches `meta/_journal.json` in git (use `wrangler d1 execute --remote -- "SELECT * FROM __drizzle_migrations"`).
2. If they match, delete both orphan files (`0004_first_ironclad.sql`, `0009_add_user_role.sql`) in a dedicated commit with a clear message.
3. If they diverge, write a recovery migration first that brings prod's journal in line with git, then delete the orphans.

### Dagre vs Saved Positions

CroutonFlow's dagre auto-layout overrides saved positions on data refresh. Partially fixed by seeding positionCache from savedPositions, but still fragile.

**Needed:** proper lock/unlock UX where locked nodes are never touched by dagre.

### Assistant maxSteps Exhaustion

`maxSteps: 15` gets exhausted when the assistant creates + dispatches many items. Accumulated tool results eat context.

**Needed:** streaming tool results, or summarize-and-continue pattern.

### Migration Snapshot Drift

`npx nuxt db generate` can pick up schema changes that were already applied if the migration history snapshot is out of sync. Causes duplicate `ALTER TABLE` errors.

**Workaround:** always review generated migration SQL before applying.

### Dispatch Capacity

Pi worker has `maxSessions: 3`. Bulk dispatches (e.g., assistant dispatches 11 items) get 503. Items reset to queued on rejection, but the assistant should be capacity-aware — dispatch in batches of 3.

---

## Deployment Reference

### Cloudflare Resources

| Resource | Name | ID |
|----------|------|----|
| D1 Database | `thinkgraph-db` | `a370a513-908a-4402-a559-609a79401475` |
| KV Namespace | `thinkgraph-kv` | `7356f04d4f1f44208130654c4de11c44` |
| Pages Project | `thinkgraph` | — |

### CI/CD

GitHub Actions: `.github/workflows/deploy-thinkgraph.yml`
- Triggers on push to `staging` branch
- Manual dispatch with environment choice
- Always `nuxt prepare` before `nuxt build` (rolldown tsconfig bug)

### Pi Worker Setup

Worker runs on Pi.dev machine, dispatched via `pi-api.pmcp.dev` Cloudflare tunnel.

**Requirements:**
- `ANTHROPIC_API_KEY` in `.env` file (systemd reads from there)
- `collabWorkerUrl` must stay in app's nuxt.config (broke production once, never remove)
- `pi auth login` required after Pi SDK updates
- nvm path must be in systemd service file

**Missing:** `.env.example` for the worker. Create one.

### Known Cloudflare Limitations

| Issue | Workaround |
|-------|-----------|
| papaparse Rollup error | Stub via `nitro.alias` (stubs in `server/utils/_cf-stubs/`) |
| Durable Objects not in Pages | CollabRoom needs separate `thinkgraph-collab` Worker |
| `[[migrations]]` in Pages config | Rejected by Wrangler. Apply D1 migrations separately |
| `env` blocks in redirected configs | Wrangler 4.64+ rejects them. Strip from `dist/_worker.js/wrangler.json` post-build |
| Terminal streaming | WebSocket works locally, needs DO relay for production |

### Env Vars (Production)

| Variable | Required | Description |
|----------|----------|-------------|
| `BETTER_AUTH_SECRET` | Yes | Session encryption |
| `BETTER_AUTH_URL` | Yes | Production URL |
| `NUXT_ANTHROPIC_API_KEY` | Yes | AI features |
| `WEBHOOK_SECRET` | Yes | Worker callback auth |
| `REPLICATE_API_TOKEN` | For Flux | Image generation |
| `OPENAI_API_KEY` | For OpenAI | Alternative provider |

---

## decisions vs workitems (historical)

v1 had two collections:
- `thinkgraphDecisions` — nodes on the thinking canvas (legacy exploration mode)
- `thinkgraphWorkItems` — PM pipeline work items

v2 kills `thinkgraphDecisions`. One collection (`nodes`), one model. The confusion is over.

**Update 2026-04-07:** The Phase 0 migration shipped as `0013_phase0_unified_nodes.sql` and the MCP tools (`create-node`, `update-node`, `store-artifact`, `expand-node`, `get-digest`, `get-thinking-path`, `resume-graph`, `search-graph`) in `apps/thinkgraph/server/mcp/tools/` were rewritten to reference `thinkgraph_nodes`. `apps/thinkgraph/server/db/schema.ts` no longer exports `thinkgraphDecisions` or `thinkgraphWorkItems`.

**What still hasn't been cleaned up** (audit 2026-04-07):
- `apps/thinkgraph/layers/thinkgraph/collections/decisions/` and `.../workitems/` folders are still on disk.
- `apps/thinkgraph/server/api/teams/[id]/thinkgraph-decisions/` has 11 endpoints (`claude.post.ts`, `chat.post.ts`, `brief.post.ts`, `digest.post.ts`, `dispatch-multi.post.ts`, `expand-with-context.post.ts`, `synthesize.post.ts`, `resume.get.ts`, plus per-decision `dispatch.post.ts`, `expand.post.ts`, `context.get.ts`) that import `getAllThinkgraphDecisions` and `createThinkgraphDecision` from `~~/layers/thinkgraph/collections/decisions/server/database/queries`. These need to be migrated to `thinkgraph_nodes` (or confirmed dead and deleted) before the `decisions/` collection folder can be removed.
- `apps/thinkgraph/app/components/ThinkgraphWorkitemsNode.vue` is the only file that still imports from `workitems/` — and it has no consumers itself, so it's likely dead too. Confirm with a wider grep across the app shell before removing.
- The legacy database tables (`thinkgraph_decisions`, `thinkgraph_workitems`) still exist in production. Dropping them is a separate decision and a separate migration; code-level cleanup must come first.
