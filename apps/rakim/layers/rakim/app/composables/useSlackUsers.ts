/**
 * Composable for fetching Slack workspace users
 *
 * Handles fetching users from a Slack workspace for user mapping.
 * Uses the /api/slack/users endpoint which requires users:read scope.
 *
 * @example
 * ```ts
 * const { fetchSlackUsers, users, loading, error } = useSlackUsers()
 *
 * await fetchSlackUsers({
 *   slackToken: 'xoxb-xxx',
 *   teamId: 'T12345'
 * })
 *
 * if (users.value) {
 *   console.log('Found', users.value.length, 'users')
 * }
 * ```
 */

export interface SlackUser {
  id: string
  name: string
  email: string | null
  avatar: string | null
  realName: string | null
}

export interface FetchSlackUsersOptions {
  slackToken: string
  teamId: string
}

export function useSlackUsers() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const users = ref<SlackUser[]>([])

  /**
   * Fetch Slack workspace users
   */
  async function fetchSlackUsers(options: FetchSlackUsersOptions): Promise<SlackUser[]> {
    const { slackToken, teamId } = options

    if (!slackToken || !teamId) {
      error.value = 'Please provide both Slack token and team ID'
      return []
    }

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{
        success: boolean
        users: SlackUser[]
        total: number
      }>('/api/slack/users', {
        query: {
          slackToken,
          teamId
        }
      })

      if (response.success) {
        users.value = response.users
        return response.users
      } else {
        throw new Error('Failed to fetch Slack users')
      }
    } catch (err: any) {
      console.error('Failed to fetch Slack users:', err)

      // Handle specific error cases
      if (err.statusCode === 403 || err.data?.statusMessage?.includes('missing_scope')) {
        error.value = 'Slack integration needs re-authorization with users:read scope'
      } else if (err.statusCode === 401) {
        error.value = 'Invalid Slack token or insufficient permissions'
      } else if (err.statusCode === 429) {
        error.value = 'Slack rate limit exceeded. Please try again later.'
      } else {
        error.value = err.data?.statusMessage || err.message || 'Failed to fetch Slack users'
      }

      users.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Clear users and error state
   */
  function clearUsers() {
    users.value = []
    error.value = null
  }

  return {
    fetchSlackUsers,
    clearUsers,
    users,
    loading,
    error,
  }
}
