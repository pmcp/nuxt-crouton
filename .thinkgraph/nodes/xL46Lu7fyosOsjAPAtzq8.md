# Discovery: watch-repos.post.ts Pattern for Stuck-Worker Cron

## Auth Pattern

File: `apps/thinkgraph/server/api/cron/watch-repos.post.ts`

1. **Env var**: `WATCH_REPOS_CRON_SECRET` via `useRuntimeConfig().watchReposCronSecret`
2. **Guard**: If env var not set → `createError({ status: 503, statusText: '...' })`
3. **Auth check**: Accepts secret via:
   - `Authorization: Bearer <secret>` header
   - `?secret=<secret>` query param
4. **Unauthorized**: `createError({ status: 401, statusText: 'Unauthorized' })`

## Request Body Pattern

- `readBody(event).catch(() => ({}))` — graceful fallback on missing/malformed body
- Optional typed fields extracted with `typeof body?.field === 'string'` guards
- Validation errors: `createError({ status: 400, statusText: '...' })`

## Response Shape

```json
{
  "runAt": "ISO timestamp",
  "teamId": "string | null",
  "createNodes": true,
  "projectId": "string | null",
  "results": { /* delegated to runner */ }
}
```

Always includes `runAt` timestamp plus echo of input params.

## Error Handling

- Uses Nuxt 4.3+ pattern: `status` + `statusText` (NOT `statusCode`/`statusMessage`)
- Three guard levels: 503 (config missing) → 401 (bad secret) → 400 (invalid params)
- Delegates business logic to a separate util (`runWatchRepos`)

## Validate Graph API

File: `apps/thinkgraph/server/utils/validate-graph.ts`

- `validateGraph(teamId, projectId)` → `ValidationError[]`
- `stuck-worker` code: catches nodes with `status='working'|'dispatching'`, `assignee='pi'`, `updatedAt > 30min ago`
- Severity: `error` (not warning)

## Team & Project Enumeration

- **Projects**: `getAllThinkgraphProjects(teamId)` in `layers/thinkgraph/collections/projects/server/database/queries.ts`
- **Teams/Orgs**: `organization` table in `packages/crouton-auth/server/database/schema/auth.ts` (sqliteTable `'organization'`)
- No existing `getAllTeams()` helper found — builder will need to query `organization` table directly via drizzle, or accept `teamId` in body (like watch-repos does)

## Builder Recommendations

1. **New file**: `apps/thinkgraph/server/api/cron/check-stuck-workers.post.ts`
2. **Env var**: `STUCK_WORKERS_CRON_SECRET` → `runtimeConfig.stuckWorkersCronSecret`
3. **Copy auth pattern exactly** from watch-repos (503/401/400 guards)
4. **Body**: Accept optional `teamId`. If provided, scope to that team. Otherwise, query all orgs from `organization` table.
5. **Per team**: call `getAllThinkgraphProjects(teamId)`, then `validateGraph(teamId, projectId)` per project, filter for `code === 'stuck-worker'`
6. **Notification**: `console.warn` per stuck node (no notification infra exists)
7. **Response shape**:
   ```json
   {
     "runAt": "ISO timestamp",
     "teamId": "string | null",
     "checked": 5,
     "flagged": 2,
     "notified": 2,
     "errors": [ /* stuck-worker ValidationError[] */ ]
   }
   ```
8. **nuxt.config.ts**: Add `stuckWorkersCronSecret` to runtimeConfig
