/**
 * List Notion databases accessible to a connected account
 *
 * GET /api/teams/[id]/notion/databases?accountId=xxx
 *
 * Searches for databases the integration has access to via Notion's search API.
 */

const NOTION_API_VERSION = '2022-06-28'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const teamId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const accountId = query.accountId as string | undefined
  const notionToken = query.notionToken as string | undefined

  if (!teamId) {
    throw createError({ status: 422, statusText: 'Missing team ID' })
  }

  const token = await resolveNotionToken({ accountId, notionToken, teamId })

  try {
    const databases: { id: string; title: string; icon?: string; url: string }[] = []
    let cursor: string | undefined

    do {
      const body: Record<string, unknown> = {
        filter: { value: 'database', property: 'object' },
        page_size: 100,
      }
      if (cursor) body.start_cursor = cursor

      const response = await $fetch<any>('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': NOTION_API_VERSION,
          'Content-Type': 'application/json',
        },
        body,
      })

      for (const db of response.results || []) {
        const titleParts = db.title || []
        const title = titleParts.map((t: any) => t.plain_text).join('') || 'Untitled'
        const icon = db.icon?.type === 'emoji' ? db.icon.emoji : undefined

        databases.push({
          id: db.id,
          title,
          icon,
          url: db.url,
        })
      }

      cursor = response.has_more ? response.next_cursor : undefined
    } while (cursor)

    return { success: true, databases }
  }
  catch (error: any) {
    if (error.status === 401 || error.statusCode === 401) {
      throw createError({ status: 401, statusText: 'Invalid Notion token' })
    }
    throw createError({
      status: 500,
      statusText: error.data?.message || error.message || 'Failed to list databases',
    })
  }
})
