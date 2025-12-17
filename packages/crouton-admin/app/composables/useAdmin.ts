/**
 * useAdmin Composable
 *
 * Unified admin composable that combines all admin functionality.
 * Provides a single entry point for user management, team oversight,
 * stats, and impersonation.
 *
 * Note: Individual composables (useAdminUsers, useAdminTeams, useAdminStats,
 * useImpersonation) are auto-imported by Nuxt and can be used directly.
 *
 * @example
 * ```vue
 * <script setup>
 * // Option 1: Use unified composable
 * const {
 *   users,
 *   getUsers,
 *   banUser,
 *   deleteUser,
 *   teams,
 *   getTeams,
 *   stats,
 *   getStats,
 *   isImpersonating,
 *   startImpersonation,
 *   stopImpersonation,
 * } = useAdmin()
 *
 * // Option 2: Use individual composables (auto-imported)
 * const { users, getUsers } = useAdminUsers()
 * const { teams, getTeams } = useAdminTeams()
 * const { stats, getStats } = useAdminStats()
 * const { isImpersonating } = useImpersonation()
 * </script>
 * ```
 */
import { useAdminUsers } from './useAdminUsers'
import { useAdminTeams } from './useAdminTeams'
import { useAdminStats } from './useAdminStats'
import { useImpersonation } from './useImpersonation'

/**
 * Unified admin composable
 *
 * Combines all admin composables into a single unified interface.
 * Each composable maintains its own state, so calling useAdmin()
 * multiple times from different components shares the same state.
 */
export function useAdmin() {
  const users = useAdminUsers()
  const teams = useAdminTeams()
  const stats = useAdminStats()
  const impersonation = useImpersonation()

  return {
    // User management
    users: users.users,
    usersTotal: users.total,
    usersPage: users.page,
    usersPageSize: users.pageSize,
    usersTotalPages: users.totalPages,
    usersLoading: users.loading,
    usersError: users.error,
    getUsers: users.getUsers,
    getUser: users.getUser,
    createUser: users.createUser,
    banUser: users.banUser,
    unbanUser: users.unbanUser,
    deleteUser: users.deleteUser,

    // Team management
    teams: teams.teams,
    teamsTotal: teams.total,
    teamsPage: teams.page,
    teamsPageSize: teams.pageSize,
    teamsTotalPages: teams.totalPages,
    teamsLoading: teams.loading,
    teamsError: teams.error,
    getTeams: teams.getTeams,
    getTeam: teams.getTeam,
    getTeamMembers: teams.getTeamMembers,

    // Stats
    stats: stats.stats,
    statsLoading: stats.loading,
    statsError: stats.error,
    statsLastUpdated: stats.lastUpdated,
    getStats: stats.getStats,
    startStatsAutoRefresh: stats.startAutoRefresh,
    stopStatsAutoRefresh: stats.stopAutoRefresh,

    // Impersonation
    isImpersonating: impersonation.isImpersonating,
    originalAdminId: impersonation.originalAdminId,
    impersonatedUser: impersonation.impersonatedUser,
    impersonationLoading: impersonation.loading,
    impersonationError: impersonation.error,
    checkImpersonationStatus: impersonation.checkStatus,
    startImpersonation: impersonation.startImpersonation,
    stopImpersonation: impersonation.stopImpersonation,
  }
}
