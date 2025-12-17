/**
 * useAdminTeams Composable
 *
 * Provides team/organization management functionality for super admins.
 * Wraps the admin team API endpoints with reactive state.
 *
 * @example
 * ```vue
 * <script setup>
 * const { teams, loading, getTeams, getTeam, getTeamMembers } = useAdminTeams()
 *
 * // Load teams with filters
 * await getTeams({ personal: false, page: 1 })
 *
 * // Get team details
 * const team = await getTeam('team-id')
 * console.log(team.members)
 * </script>
 * ```
 */
import { ref, readonly } from 'vue'
import type {
  AdminTeamListItem,
  AdminTeamDetail,
  TeamListFilters,
  PaginatedResponse,
} from '../../types/admin'

export function useAdminTeams() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Current paginated list state
  const teams = ref<AdminTeamListItem[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const totalPages = ref(0)

  /**
   * Fetch paginated list of teams/organizations
   *
   * @param filters - Optional filters for the query
   * @returns Paginated response with teams
   */
  async function getTeams(filters?: TeamListFilters): Promise<PaginatedResponse<AdminTeamListItem>> {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (filters?.page) query.set('page', String(filters.page))
      if (filters?.pageSize) query.set('pageSize', String(filters.pageSize))
      if (filters?.search) query.set('search', filters.search)
      if (filters?.personal !== undefined) query.set('personal', String(filters.personal))
      if (filters?.sortBy) query.set('sortBy', filters.sortBy)
      if (filters?.sortOrder) query.set('sortOrder', filters.sortOrder)

      const queryString = query.toString()
      const url = `/api/admin/teams${queryString ? `?${queryString}` : ''}`

      const response = await $fetch<PaginatedResponse<AdminTeamListItem>>(url)

      // Update reactive state
      teams.value = response.items
      total.value = response.total
      page.value = response.page
      pageSize.value = response.pageSize
      totalPages.value = response.totalPages

      return response
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch teams'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Get detailed team information by ID
   *
   * @param teamId - Team ID to fetch
   * @returns Team detail with members
   */
  async function getTeam(teamId: string): Promise<AdminTeamDetail> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<AdminTeamDetail>(`/api/admin/teams/${teamId}`)
      return response
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch team'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Get team members
   *
   * Convenience method that fetches team detail and returns just the members.
   *
   * @param teamId - Team ID to fetch members for
   * @returns Array of team members
   */
  async function getTeamMembers(teamId: string): Promise<AdminTeamDetail['members']> {
    const team = await getTeam(teamId)
    return team.members
  }

  return {
    // State
    teams: readonly(teams),
    total: readonly(total),
    page: readonly(page),
    pageSize: readonly(pageSize),
    totalPages: readonly(totalPages),
    loading: readonly(loading),
    error: readonly(error),

    // Methods
    getTeams,
    getTeam,
    getTeamMembers,
  }
}
