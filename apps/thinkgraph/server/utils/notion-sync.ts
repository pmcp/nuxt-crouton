/**
 * Notion Sync Utility
 *
 * Two-way sync between ThinkGraph nodes and Notion pages.
 * Uses direct fetch() calls (Cloudflare Workers compatible — no Notion SDK).
 *
 * Both functions NEVER throw — they always return { success: false, error } on failure.
 */
import { eq } from 'drizzle-orm'
import { teamSettings } from '~~/server/db/schema'
import type { TeamNotionSettings } from '@fyit/crouton-auth/server/database/schema/auth'

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

/**
 * Read team's Notion settings from the database.
 */
async function getNotionSettings(teamId: string): Promise<TeamNotionSettings | null> {
  try {
    const db = useDB()
    const rows = await db
      .select({ notionSettings: teamSettings.notionSettings })
      .from(teamSettings)
      .where(eq(teamSettings.teamId, teamId))
      .limit(1)

    return rows[0]?.notionSettings ?? null
  } catch {
    return null
  }
}

/**
 * Create a Notion page in the team's configured task database.
 *
 * Called when a ThinkGraph node status transitions to 'idle' (approved).
 * Returns the Notion page ID on success so it can be stored on the node.
 */
export async function createNotionTask(
  teamId: string,
  node: { id: string, title: string, brief?: string, nodeType?: string }
): Promise<{ success: boolean, notionPageId?: string, error?: string }> {
  try {
    const settings = await getNotionSettings(teamId)
    if (!settings?.integrationToken || !settings?.taskDatabaseId) {
      return { success: false, error: 'Notion integration not configured' }
    }

    const statusValue = settings.statusMapping?.idle ?? 'To Do'

    const response = await fetch(`${NOTION_API_BASE}/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.integrationToken}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: settings.taskDatabaseId },
        properties: {
          Name: {
            title: [
              {
                text: { content: node.title }
              }
            ]
          },
          Status: {
            status: { name: statusValue }
          }
        },
        // Add brief as page content if available
        ...(node.brief ? {
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [
                  {
                    text: { content: node.brief.slice(0, 2000) }
                  }
                ]
              }
            }
          ]
        } : {})
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return { success: false, error: `Notion API ${response.status}: ${errorBody.slice(0, 200)}` }
    }

    const data = await response.json() as { id: string }
    return { success: true, notionPageId: data.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Update the Status property of an existing Notion page.
 *
 * Called when a ThinkGraph node status transitions to 'done' (or other mapped statuses).
 * Uses the team's statusMapping to translate ThinkGraph statuses to Notion Status values.
 */
export async function updateNotionTaskStatus(
  teamId: string,
  notionPageId: string,
  status: string
): Promise<{ success: boolean, error?: string }> {
  try {
    const settings = await getNotionSettings(teamId)
    if (!settings?.integrationToken) {
      return { success: false, error: 'Notion integration not configured' }
    }

    const statusValue = settings.statusMapping?.[status as keyof typeof settings.statusMapping]
    if (!statusValue) {
      return { success: false, error: `No Notion status mapping for "${status}"` }
    }

    const response = await fetch(`${NOTION_API_BASE}/pages/${notionPageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${settings.integrationToken}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          Status: {
            status: { name: statusValue }
          }
        }
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return { success: false, error: `Notion API ${response.status}: ${errorBody.slice(0, 200)}` }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}
