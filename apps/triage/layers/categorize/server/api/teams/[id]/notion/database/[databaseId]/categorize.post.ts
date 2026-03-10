/**
 * Update Notion pages with category assignments
 *
 * POST /api/teams/[id]/notion/database/[databaseId]/categorize
 *
 * Body:
 * {
 *   notionToken: string,
 *   propertyName: string,       // Notion select property to update
 *   assignments: [
 *     { pageId: string, category: string }
 *   ]
 * }
 *
 * Updates each page's select property with the assigned category name.
 * Rate-limited with 200ms delays between requests.
 */

import { z } from 'zod'

const NOTION_API_VERSION = '2022-06-28'

const requestSchema = z.object({
  notionToken: z.string().min(1),
  propertyName: z.string().min(1),
  propertyType: z.enum(['select', 'status', 'multi_select']).default('select'),
  assignments: z.array(z.object({
    pageId: z.string().min(1),
    category: z.string().min(1),
  })).min(1),
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const body = await readBody(event)
  const parsed = requestSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      status: 400,
      statusText: 'Invalid request',
      data: { errors: parsed.error.flatten().fieldErrors },
    })
  }

  const { notionToken, propertyName, propertyType, assignments } = parsed.data

  const results: { pageId: string; success: boolean; error?: string }[] = []

  for (let i = 0; i < assignments.length; i++) {
    const { pageId, category } = assignments[i]!

    try {
      await $fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${notionToken}`,
          'Notion-Version': NOTION_API_VERSION,
          'Content-Type': 'application/json',
        },
        body: {
          properties: {
            [propertyName]: propertyType === 'multi_select'
              ? { multi_select: [{ name: category }] }
              : { [propertyType]: { name: category } },
          },
        },
      })

      results.push({ pageId, success: true })
    }
    catch (error: any) {
      const notionError = error.data?.message || error.data?.object === 'error' && error.data?.message
      const errorMessage = notionError || error.message || 'Failed to update page'
      console.error(`[categorize] Failed to update page ${pageId}:`, errorMessage, error.data || '')
      results.push({
        pageId,
        success: false,
        error: errorMessage,
      })
    }

    // Rate limiting: 200ms between requests
    if (i < assignments.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  const succeeded = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return {
    success: failed === 0,
    total: assignments.length,
    succeeded,
    failed,
    results,
  }
})
