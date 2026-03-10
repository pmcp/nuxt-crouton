/**
 * Fetch all pages from a Notion database
 *
 * GET /api/teams/[id]/notion/database/[databaseId]/pages?accountId=xxx
 * GET /api/teams/[id]/notion/database/[databaseId]/pages?notionToken=secret_xxx
 *
 * Returns simplified page objects with title, url, and key properties.
 * Handles pagination automatically (Notion returns max 100 per request).
 */

const NOTION_API_VERSION = '2022-06-28'

interface NotionUser {
  name?: string
  id: string
}

interface NotionPage {
  id: string
  title: string
  url: string
  properties: Record<string, unknown>
  createdTime: string
  lastEditedTime: string
  createdBy: NotionUser | null
  lastEditedBy: NotionUser | null
}

function extractTitle(properties: Record<string, any>): string {
  for (const prop of Object.values(properties)) {
    if (prop.type === 'title' && Array.isArray(prop.title)) {
      return prop.title.map((t: any) => t.plain_text).join('') || 'Untitled'
    }
  }
  return 'Untitled'
}

function extractUser(user: any): NotionUser | null {
  if (!user) return null
  return { name: user.name || undefined, id: user.id }
}

function simplifyProperty(prop: any): unknown {
  switch (prop.type) {
    case 'title':
      return prop.title?.map((t: any) => t.plain_text).join('') || ''
    case 'rich_text':
      return prop.rich_text?.map((t: any) => t.plain_text).join('') || ''
    case 'select':
      return prop.select?.name || null
    case 'multi_select':
      return prop.multi_select?.map((s: any) => s.name) || []
    case 'status':
      return prop.status?.name || null
    case 'number':
      return prop.number
    case 'checkbox':
      return prop.checkbox
    case 'date':
      return prop.date?.start || null
    case 'url':
      return prop.url || null
    case 'email':
      return prop.email || null
    case 'people':
      return prop.people?.map((p: any) => p.name || p.id) || []
    case 'created_by':
      return prop.created_by?.name || prop.created_by?.id || null
    case 'last_edited_by':
      return prop.last_edited_by?.name || prop.last_edited_by?.id || null
    case 'created_time':
      return prop.created_time || null
    case 'last_edited_time':
      return prop.last_edited_time || null
    default:
      return null
  }
}

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const teamId = getRouterParam(event, 'id')
  const databaseId = getRouterParam(event, 'databaseId')
  const query = getQuery(event)

  if (!teamId) {
    throw createError({ status: 422, statusText: 'Missing team ID' })
  }
  if (!databaseId) {
    throw createError({ status: 422, statusText: 'Missing databaseId' })
  }

  const token = await resolveNotionToken({
    accountId: query.accountId as string | undefined,
    notionToken: query.notionToken as string | undefined,
    teamId,
  })

  try {
    const allPages: NotionPage[] = []
    let cursor: string | undefined

    // Paginate through all pages
    do {
      const body: Record<string, unknown> = { page_size: 100 }
      if (cursor) body.start_cursor = cursor

      const response = await $fetch<any>(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': NOTION_API_VERSION,
          'Content-Type': 'application/json',
        },
        body,
      })

      for (const page of response.results || []) {
        const simplifiedProps: Record<string, unknown> = {}
        let createdByFromProp: NotionUser | null = null
        let lastEditedByFromProp: NotionUser | null = null

        for (const [name, prop] of Object.entries(page.properties || {}) as [string, any][]) {
          simplifiedProps[name] = simplifyProperty(prop)
          // Extract full user objects from property columns (these have names)
          if (prop.type === 'created_by') createdByFromProp = extractUser(prop.created_by)
          if (prop.type === 'last_edited_by') lastEditedByFromProp = extractUser(prop.last_edited_by)
        }

        allPages.push({
          id: page.id,
          title: extractTitle(page.properties || {}),
          url: page.url,
          properties: simplifiedProps,
          createdTime: page.created_time,
          lastEditedTime: page.last_edited_time,
          createdBy: createdByFromProp || extractUser(page.created_by),
          lastEditedBy: lastEditedByFromProp || extractUser(page.last_edited_by),
        })
      }

      cursor = response.has_more ? response.next_cursor : undefined
    } while (cursor)

    return {
      success: true,
      databaseId,
      pages: allPages,
      total: allPages.length,
    }
  }
  catch (error: any) {
    if (error.status === 401 || error.statusCode === 401) {
      throw createError({ status: 401, statusText: 'Invalid Notion token' })
    }
    if (error.status === 404 || error.statusCode === 404) {
      throw createError({ status: 404, statusText: 'Database not found. Check ID and integration access.' })
    }
    if (error.statusCode) throw error

    throw createError({
      status: 500,
      statusText: error.message || 'Failed to fetch Notion pages',
    })
  }
})
