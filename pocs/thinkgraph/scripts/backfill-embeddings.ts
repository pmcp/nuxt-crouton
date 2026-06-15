/**
 * Backfill script — index every existing thinkgraph_node into Vectorize.
 *
 * Idempotent: re-running re-embeds and re-upserts. Safe to run multiple
 * times. Bound by per-row OpenAI embedding cost (text-embedding-3-small).
 *
 * Usage:
 *   # 1. Make sure the dev server (or deployed Pages app) is running with
 *   #    the VECTORIZE binding present.
 *   # 2. Set NUXT_ADMIN_BACKFILL_SECRET in the running app's env.
 *   # 3. Run:
 *   #
 *   #    THINKGRAPH_URL=http://localhost:3004 \
 *   #    ADMIN_SECRET=your-secret \
 *   #    npx tsx apps/thinkgraph/scripts/backfill-embeddings.ts [teamId]
 *   #
 *   # Pass an optional teamId arg to scope the backfill. Omit to walk all teams.
 *
 * Why an HTTP indirection: indexing needs the running Nuxt server context
 * (D1, useDB, the VECTORIZE binding from the Cloudflare runtime). The
 * script just calls the admin endpoint that does the real work.
 */

const url = process.env.THINKGRAPH_URL || 'http://localhost:3004'
const secret = process.env.ADMIN_SECRET
const teamId = process.argv[2]

if (!secret) {
  console.error('ADMIN_SECRET env var required (must match NUXT_ADMIN_BACKFILL_SECRET on the server)')
  process.exit(1)
}

async function main() {
  const endpoint = `${url}/api/admin/backfill-embeddings`
  console.log(`POST ${endpoint}${teamId ? ` (teamId=${teamId})` : ' (all teams)'}`)

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-secret': secret!,
    },
    body: JSON.stringify(teamId ? { teamId } : {}),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`Backfill failed: ${res.status} ${res.statusText}\n${text}`)
    process.exit(1)
  }

  const result = await res.json() as {
    total: number
    indexed: number
    skipped: number
    failed: number
    errors: Array<{ nodeId: string, error: string }>
  }

  console.log(`Total: ${result.total}`)
  console.log(`Indexed: ${result.indexed}`)
  console.log(`Skipped: ${result.skipped} (empty content / no binding)`)
  console.log(`Failed: ${result.failed}`)
  if (result.errors?.length) {
    console.log('\nFirst errors:')
    for (const e of result.errors) console.log(`  ${e.nodeId}: ${e.error}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
