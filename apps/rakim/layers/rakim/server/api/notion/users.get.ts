/**
 * Fetch Notion users from workspace
 *
 * GET /api/notion/users?notionToken=secret_xxx&teamId=xxx
 *
 * Returns list of users from a Notion workspace for use in user mapping dropdowns.
 * Requires a Notion integration token with access to the workspace.
 *
 * Edge-compatible version using fetch instead of @notionhq/client SDK.
 */

const NOTION_API_VERSION = '2022-06-28'

export default defineEventHandler(async (event) => {
  try {
    // Get parameters from query
    const query = getQuery(event)
    const notionToken = query.notionToken as string
    const teamId = query.teamId as string

    // Validate required parameters
    if (!notionToken) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Missing required parameter: notionToken'
      })
    }

    if (!teamId) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Missing required parameter: teamId'
      })
    }

    // Validate token format (Notion tokens can be internal 'secret_*' or public 'ntn_*')
    if (!notionToken.startsWith('secret_') && !notionToken.startsWith('ntn_')) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Invalid Notion token format. Token must start with "secret_" (internal) or "ntn_" (public)'
      })
    }

    // Fetch all users from workspace using edge-compatible fetch
    const response = await $fetch<any>('https://api.notion.com/v1/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': NOTION_API_VERSION,
      },
    })

    // Debug: Log full response
    logger.debug('[Notion Users] Raw API Response:', JSON.stringify(response, null, 2))
    logger.debug('[Notion Users] Total results from API:', response.results?.length || 0)
    logger.debug('[Notion Users] Has next cursor:', !!response.next_cursor)

    // Transform to simpler format for frontend
    const users = response.results.map((user: any) => ({
      id: user.id,
      name: user.name || 'Unknown',
      email: user.person?.email || user.bot?.owner?.user?.person?.email || null,
      type: user.type, // 'person' or 'bot'
      avatarUrl: user.avatar_url || null
    }))

    // Debug: Log user types breakdown
    const personCount = users.filter((u: any) => u.type === 'person').length
    const botCount = users.filter((u: any) => u.type === 'bot').length
    logger.debug(`[Notion Users] User type breakdown - Persons: ${personCount}, Bots: ${botCount}`)
    logger.debug('[Notion Users] All users:', users.map((u: any) => ({ name: u.name, type: u.type, email: u.email })))

    // Filter out bots if requested
    const includeBots = query.includeBots === 'true'
    const filteredUsers = includeBots
      ? users
      : users.filter((u: any) => u.type === 'person')

    logger.debug(`[Notion Users] After filtering - Returning ${filteredUsers.length} users for team ${teamId} (includeBots: ${includeBots})`)

    return {
      success: true,
      users: filteredUsers,
      total: filteredUsers.length
    }
  } catch (error: any) {
    logger.error('[Notion Users] Error:', error)

    // Handle Notion API errors
    if (error.code === 'unauthorized') {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid Notion token or insufficient permissions'
      })
    }

    if (error.code === 'rate_limited') {
      throw createError({
        statusCode: 429,
        statusMessage: 'Notion API rate limit exceeded. Please try again later.'
      })
    }

    // Pass through already formatted errors
    if (error.statusCode) {
      throw error
    }

    // Generic error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch Notion users'
    })
  }
})
