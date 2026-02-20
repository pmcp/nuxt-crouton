import { defineNitroPlugin } from 'nitropack/runtime'
import { croutonOperations } from '../database/schema'

/**
 * Nitro plugin — persists crouton:operation hook events to the crouton_operations table.
 *
 * Any package can emit system operations (auth, email, AI, webhooks, etc.) via:
 *   useNitroApp().hooks.callHook('crouton:operation', { type, source, teamId, userId, metadata })
 *
 * Persistence is non-blocking — errors are swallowed so a DB issue never breaks
 * the originating request.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('crouton:operation', async (payload) => {
    try {
      const db = useDB()
      await db.insert(croutonOperations).values({
        id: crypto.randomUUID(),
        timestamp: new Date(payload.timestamp ?? Date.now()),
        type: payload.type,
        source: payload.source,
        teamId: payload.teamId ?? null,
        userId: payload.userId ?? null,
        correlationId: payload.correlationId ?? null,
        metadata: payload.metadata ?? null
      })
    }
    catch {
      // Non-blocking: a persistence failure must never surface to the caller
    }
  })
})
