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

**Decision needed for v2:** flip to `useMetadata: true` or fix the generator.

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

MCP tools (`create-node`, `update-node`, `store-artifact`) currently reference the decisions collection and will need updating in Phase 0.
