# Discover: validateGraph() & team enumeration

## validateGraph() shape

- **Location:** `apps/thinkgraph/server/utils/validate-graph.ts`
- **Signature:** `validateGraph(teamId: string, projectId: string): Promise<ValidationError[]>`
- **Return type:** `ValidationError[]` with fields: `{ nodeId, severity, code, message, details? }`
- **`ValidationCode` union:** `'broken-context-ref' | 'broken-depends-on' | 'orphan-node' | 'duplicate-title-at-depth' | 'stuck-active' | 'stuck-worker' | 'broken-wiki-link'`

### stuck-worker filter specifics
- **Code:** `'stuck-worker'`
- **Severity:** `'error'` (not warning — implies dropped delivery)
- **Condition:** `status in ('working', 'dispatching') && assignee === 'pi' && updatedAt > 30min ago`
- **Threshold constant:** `STUCK_WORKER_MS = 30 * 60 * 1000`
- **details:** `{ updatedAt, status, stage }`
- **Filtering in cron endpoint:** `errors.filter(e => e.code === 'stuck-worker')`

## Team (organization) enumeration

Teams are stored in the `organization` table from `@fyit/crouton-auth/server/database/schema/auth`:

```ts
import { organization } from '~~/server/db/schema'
```

- **Table:** `organization` (sqlite, `id` text PK, `name`, `slug`, fields for `personal`, `isDefault`)
- **Query all teams:** `db.select().from(organization)` — no additional filter needed, or optionally filter out `personal = true` to skip personal workspaces.

### Project enumeration per team

```ts
import { getAllThinkgraphProjects } from '~~/layers/thinkgraph/collections/projects/server/database/queries'
const projects = await getAllThinkgraphProjects(teamId) // returns array with .id, .teamId, .ownerUser join
```

### Recommended cron approach

Two options:

1. **Accept optional `teamId` in body** (like watch-repos) — simplest, caller provides scope.
2. **Enumerate all teams** — query `organization` table, then `getAllThinkgraphProjects(teamId)` per team.

**Recommendation:** Support both. If `teamId` is provided, scope to that team. Otherwise, query all organizations and iterate. The watch-repos pattern does this implicitly (queries by `active` watched repos, which naturally spans teams). For stuck-worker, we need explicit team→project enumeration since `validateGraph` requires both IDs.

### useDB() availability
`useDB()` is a Nitro auto-import available in all server code. Used throughout `apps/thinkgraph/server/utils/`.

## Builder implementation plan

```ts
// Pseudocode for check-stuck-workers.post.ts
const db = useDB()

// Get teams to check
let teamIds: string[]
if (body.teamId) {
  teamIds = [body.teamId]
} else {
  const orgs = await db.select({ id: organization.id }).from(organization)
  teamIds = orgs.map(o => o.id)
}

// For each team, get projects, run validateGraph, filter stuck-worker
let checked = 0, flagged = 0
for (const teamId of teamIds) {
  const projects = await getAllThinkgraphProjects(teamId)
  for (const project of projects) {
    checked++
    const errors = await validateGraph(teamId, project.id)
    const stuck = errors.filter(e => e.code === 'stuck-worker')
    if (stuck.length > 0) {
      flagged += stuck.length
      for (const s of stuck) {
        console.warn('[stuck-worker]', { teamId, projectId: project.id, ...s })
      }
    }
  }
}

return { checked, flagged, notified: flagged } // notified = flagged since console.warn is the notification
```
