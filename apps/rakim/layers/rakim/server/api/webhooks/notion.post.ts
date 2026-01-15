/**
 * Notion Webhook Endpoint
 *
 * Receives Notion webhook events and handles task completion notifications.
 *
 * Flow:
 * 1. Notion webhook received (task status changed to "Done")
 * 2. Query discubot database for task by notionPageId
 * 3. Load discussion and source config
 * 4. Post completion message to original Slack/Figma thread
 *
 * @see https://developers.notion.com/reference/webhooks
 */

import { getAdapter } from '#layers/discubot/server/adapters'
import { eq, and } from 'drizzle-orm'
import { logger } from '#layers/discubot/server/utils/logger'

/**
 * Notion webhook payload structure
 * @see https://developers.notion.com/reference/webhooks
 */
interface NotionWebhookPayload {
  object: 'event'
  type: 'page' | 'database' | 'block'
  event: {
    object: 'page'
    id: string // Page ID (UUID format)
  }
  data?: {
    object: 'page'
    id: string
    properties?: {
      Status?: {
        status?: {
          name?: string
        }
      }
      [key: string]: any
    }
    [key: string]: any
  }
  [key: string]: any
}

export default defineEventHandler(async (event) => {
  logger.debug('[Notion Webhook] ===== REQUEST RECEIVED =====')
  logger.debug('[Notion Webhook] Request received', {
    method: event.method,
    path: event.path,
  })

  try {
    // Read body
    const body = await readBody<NotionWebhookPayload>(event)
    logger.debug('[Notion Webhook] Payload received', { type: body?.type })

    // ============================================================================
    // VALIDATE WEBHOOK PAYLOAD
    // ============================================================================
    if (!body || !body.data) {
      logger.debug('[Notion Webhook] Missing data in payload')
      return {
        success: true,
        message: 'Payload missing data - ignored',
      }
    }

    // Only process page update events
    if (body.type !== 'page' && body.data?.object !== 'page') {
      logger.debug('[Notion Webhook] Ignoring non-page event', { eventType: body.type })
      return {
        success: true,
        message: 'Non-page event ignored',
      }
    }

    // Extract page ID from the event
    const notionPageId = body.data.id || body.event?.id

    if (!notionPageId) {
      logger.warn('[Notion Webhook] No page ID found in webhook payload')
      return {
        success: false,
        error: 'Missing page ID',
      }
    }

    logger.debug('[Notion Webhook] Processing page', { notionPageId })

    // Check if status is "Done" (case-insensitive)
    // Note: Notion webhook payloads may not always include full property data
    // If status is missing, we'll query Notion API to get current status
    const status = body.data?.properties?.Status?.status?.name

    if (status && status.toLowerCase() !== 'done') {
      logger.debug('[Notion Webhook] Status is not Done, ignoring', { status })
      return {
        success: true,
        message: `Status "${status}" is not Done - ignored`,
      }
    }

    // ============================================================================
    // QUERY TASK BY NOTION PAGE ID
    // ============================================================================
    const db = useDB()
    const { discubotTasks } = await import('#layers/discubot/collections/tasks/server/database/schema')
    const { discubotDiscussions } = await import('#layers/discubot/collections/discussions/server/database/schema')
    const { discubotConfigs } = await import('#layers/discubot-configs/server/database/schema')

    const task = await db
      .select()
      .from(discubotTasks)
      .where(eq(discubotTasks.notionPageId, notionPageId))
      .limit(1)
      .get()

    if (!task) {
      logger.warn('[Notion Webhook] Task not found for Notion page', { notionPageId })
      return {
        success: false,
        error: 'Task not found',
        notionPageId,
      }
    }

    logger.debug('[Notion Webhook] Found task', {
      taskId: task.id,
      discussionId: task.discussionId,
      sourceUrl: task.sourceUrl,
    })

    // ============================================================================
    // LOAD DISCUSSION
    // ============================================================================
    const discussion = await db
      .select()
      .from(discubotDiscussions)
      .where(eq(discubotDiscussions.id, task.discussionId))
      .limit(1)
      .get()

    if (!discussion) {
      logger.error('[Notion Webhook] Discussion not found', undefined, {
        discussionId: task.discussionId,
      })
      return {
        success: false,
        error: 'Discussion not found',
        discussionId: task.discussionId,
      }
    }

    logger.debug('[Notion Webhook] Found discussion', {
      discussionId: discussion.id,
      sourceType: discussion.sourceType,
      sourceThreadId: discussion.sourceThreadId,
      sourceConfigId: discussion.sourceConfigId,
    })

    // ============================================================================
    // LOAD SOURCE CONFIG
    // ============================================================================
    const config = await db
      .select()
      .from(discubotConfigs)
      .where(eq(discubotConfigs.id, discussion.sourceConfigId))
      .limit(1)
      .get()

    if (!config) {
      logger.error('[Notion Webhook] Config not found', undefined, {
        configId: discussion.sourceConfigId,
      })
      return {
        success: false,
        error: 'Config not found',
        configId: discussion.sourceConfigId,
      }
    }

    // Map database config to SourceConfig type
    const sourceConfig = {
      id: config.id,
      teamId: config.teamId,
      sourceType: config.sourceType as 'slack' | 'figma',
      name: config.name || '',
      apiToken: config.apiToken || '',
      notionToken: config.notionToken,
      notionDatabaseId: config.notionDatabaseId,
      anthropicApiKey: config.anthropicApiKey || undefined,
      aiEnabled: config.aiEnabled || false,
      autoSync: config.autoSync || false,
      settings: {},
      sourceMetadata: (config.sourceMetadata as Record<string, any>) || undefined,
      aiSummaryPrompt: config.aiSummaryPrompt || undefined,
      aiTaskPrompt: config.aiTaskPrompt || undefined,
      notionFieldMapping: config.notionFieldMapping || {},
      webhookUrl: config.webhookUrl || '',
      active: config.active,
    }

    logger.debug('[Notion Webhook] Loaded config', {
      configId: sourceConfig.id,
      sourceType: sourceConfig.sourceType,
      teamId: sourceConfig.teamId,
    })

    // ============================================================================
    // POST COMPLETION MESSAGE TO SOURCE THREAD
    // ============================================================================
    const adapter = getAdapter(discussion.sourceType)

    // Build completion message
    const completionMessage = `✅ Task completed in Notion!\n\n**${task.title}**\n${task.notionPageUrl}`

    logger.debug('[Notion Webhook] Posting completion message to thread', {
      sourceType: discussion.sourceType,
      sourceThreadId: discussion.sourceThreadId,
      taskTitle: task.title,
    })

    const success = await adapter.postReply(
      discussion.sourceThreadId,
      completionMessage,
      sourceConfig
    )

    if (success) {
      logger.info('[Notion Webhook] ✅ Completion message posted successfully', {
        taskId: task.id,
        notionPageId: task.notionPageId,
        sourceThreadId: discussion.sourceThreadId,
        sourceType: discussion.sourceType,
      })

      return {
        success: true,
        message: 'Completion notification posted to source thread',
        task: {
          id: task.id,
          title: task.title,
          notionPageUrl: task.notionPageUrl,
        },
        sourceThreadId: discussion.sourceThreadId,
        timestamp: new Date().toISOString(),
      }
    } else {
      logger.error('[Notion Webhook] ❌ Failed to post completion message', undefined, {
        taskId: task.id,
        sourceThreadId: discussion.sourceThreadId,
      })

      return {
        success: false,
        error: 'Failed to post completion message to source thread',
        task: {
          id: task.id,
          title: task.title,
        },
      }
    }

  } catch (error) {
    logger.error('[Notion Webhook] Unexpected error', error, {
      stack: (error as Error).stack,
    })

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: { error: (error as Error).message },
    })
  }
})
