/**
 * Collection Sync Plugin (Client-only)
 *
 * Auto-initializes real-time collection sync when crouton-collab is installed.
 * This plugin:
 * 1. Watches for team context availability
 * 2. Establishes a Yjs sync room for the team
 * 3. Hooks into crouton:mutation to signal changes
 * 4. Refreshes collection caches when remote changes are detected
 *
 * Architecture:
 * - Uses useCollectionSyncSignal for Yjs-based version sync
 * - Hooks into crouton:mutation (fired by useCollectionMutation)
 * - Finds and refreshes all cache keys for changed collections
 *
 * The .client.ts suffix ensures this only runs on the client side.
 */
import { useCollectionSyncSignal } from '../composables/useCollectionSyncSignal'

export default defineNuxtPlugin((nuxtApp) => {
  // Track if sync is initialized to avoid duplicate setup
  let syncInitialized = false
  let signalChangeFn: ((collection: string) => void) | null = null

  /**
   * Initialize sync for a team
   */
  function initSync(teamId: string): void {
    if (syncInitialized) return
    syncInitialized = true

    const { signalChange } = useCollectionSyncSignal({
      teamId,
      debounceMs: 300,
      onCollectionChanged: async (collection: string) => {
        // Find all cache keys for this collection and refresh them
        const prefix = `collection:${collection}:`

        // Get all matching keys from Nuxt's async data payload
        const allKeys = Object.keys(nuxtApp.payload.data || {})
        const matchingKeys = allKeys.filter(key => key.startsWith(prefix))

        if (matchingKeys.length > 0) {
          // Refresh all matching queries
          await Promise.all(matchingKeys.map(key => refreshNuxtData(key)))
        }

        // Also refresh individual item caches for this collection
        const itemPrefix = `collection-item:${collection}:`
        const itemKeys = allKeys.filter(key => key.startsWith(itemPrefix))

        if (itemKeys.length > 0) {
          await Promise.all(itemKeys.map(key => refreshNuxtData(key)))
        }
      }
    })

    signalChangeFn = signalChange
  }

  /**
   * Get team ID from route or context
   */
  function getTeamIdFromContext(): string | undefined {
    // Try route params first
    const route = useRoute()
    const teamParam = route.params.team
    if (typeof teamParam === 'string' && teamParam) {
      return teamParam
    }

    // Try useTeam composable if available (from @crouton/auth)
    try {
      // @ts-expect-error - useTeam may not be available if crouton-auth not installed
      const { currentTeam } = useTeam()
      if (currentTeam?.value?.id) {
        return currentTeam.value.id
      }
    } catch {
      // useTeam not available, that's fine
    }

    return undefined
  }

  // Watch for route changes to detect team context
  const router = useRouter()

  router.afterEach(() => {
    const teamId = getTeamIdFromContext()
    if (teamId && !syncInitialized) {
      initSync(teamId)
    }
  })

  // Also check immediately in case we're already on a team route
  const initialTeamId = getTeamIdFromContext()
  if (initialTeamId) {
    initSync(initialTeamId)
  }

  // Hook into crouton:mutation to signal changes
  nuxtApp.hook('crouton:mutation', (event: { collection: string }) => {
    if (signalChangeFn) {
      signalChangeFn(event.collection)
    }
  })
})
