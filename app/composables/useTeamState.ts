/**
 * useTeamState Composable
 *
 * Shared state for team context using Nuxt's useState.
 * This state is synchronized between server and client via SSR hydration.
 *
 * Used by the team-context.global middleware to store resolved team info.
 * Consumers should use useTeamContext() for the full API.
 *
 * @example
 * ```vue
 * <script setup>
 * const { teamId, teamSlug, team } = useTeamState()
 * </script>
 * ```
 */
import type { Team } from '../../types'

export interface TeamState {
  /** Current team ID */
  teamId: string | null
  /** Current team slug (for URLs) */
  teamSlug: string | null
  /** Full team object (may be null if not fetched) */
  team: Team | null
  /** Whether team context has been resolved */
  resolved: boolean
  /** Error if team resolution failed */
  error: string | null
}

const defaultState: TeamState = {
  teamId: null,
  teamSlug: null,
  team: null,
  resolved: false,
  error: null,
}

/**
 * Get shared team state
 *
 * Uses Nuxt's useState for SSR-safe shared state.
 * The state is:
 * - Initialized on the server during SSR
 * - Hydrated to the client on initial load
 * - Reactive and shared across components
 */
export function useTeamState() {
  const state = useState<TeamState>('crouton-auth-team', () => ({ ...defaultState }))

  /**
   * Set the current team context
   */
  function setTeamContext(context: {
    teamId: string | null
    teamSlug: string | null
    team?: Team | null
  }) {
    state.value = {
      teamId: context.teamId,
      teamSlug: context.teamSlug,
      team: context.team ?? null,
      resolved: true,
      error: null,
    }
  }

  /**
   * Set an error state
   */
  function setTeamError(error: string) {
    state.value = {
      teamId: null,
      teamSlug: null,
      team: null,
      resolved: true,
      error,
    }
  }

  /**
   * Clear the team context
   */
  function clearTeamContext() {
    state.value = { ...defaultState }
  }

  /**
   * Reset resolved state (for re-resolution)
   */
  function markUnresolved() {
    state.value.resolved = false
  }

  return {
    // State
    state,

    // Getters (computed for reactivity)
    teamId: computed(() => state.value.teamId),
    teamSlug: computed(() => state.value.teamSlug),
    team: computed(() => state.value.team),
    isResolved: computed(() => state.value.resolved),
    hasError: computed(() => !!state.value.error),
    error: computed(() => state.value.error),
    hasTeamContext: computed(() => !!state.value.teamId),

    // Actions
    setTeamContext,
    setTeamError,
    clearTeamContext,
    markUnresolved,
  }
}
