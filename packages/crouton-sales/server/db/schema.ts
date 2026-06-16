// Database schema exports for crouton-sales.
// NuxtHub scans `server/db/schema.ts` across extended layers to build the
// bundled drizzle schema, so re-exporting here makes the consuming app pick up
// `sales_sync_outbox` + `sales_sync_status` in `db:generate` migrations
// automatically — no manual schema import needed in the app (same pattern as
// crouton-flow/crouton-collab).
export { salesSyncOutbox, salesSyncStatus } from '../database/schema'
