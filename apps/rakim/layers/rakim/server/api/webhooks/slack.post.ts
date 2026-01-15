/**
 * Slack Webhook Endpoint
 *
 * Receives Slack Events API webhooks and processes them through the discussion pipeline.
 *
 * Flow:
 * 1. URL verification challenge → Return challenge
 * 2. app_mention events → Parse with adapter → Process discussion → Return result
 * 3. Other events → Ignore
 *
 * **Flows Support (Phase 5):**
 * - Automatically finds flow by slackTeamId (from event.team_id)
 * - Falls back to legacy config if no flow found
 * - Flow routing handled by processor service
 *
 * @see https://api.slack.com/events-api
 */

import { getAdapter } from '#layers/discubot/server/adapters'
import { processDiscussion } from '#layers/discubot/server/services/processor'
import type { ProcessingResult } from '#layers/discubot/server/services/processor'

export default defineEventHandler(async (event) => {
  logger.debug('[Slack Webhook] ===== REQUEST RECEIVED =====')
  logger.debug('[Slack Webhook] Method:', event.method)
  logger.debug('[Slack Webhook] Path:', event.path)

  try {
    // Read body
    const body = await readBody(event)
    logger.debug('[Slack Webhook] Payload type:', body?.type)

    // ============================================================================
    // HANDLE URL VERIFICATION CHALLENGE
    // ============================================================================
    if (body && body.type === 'url_verification') {
      logger.debug('[Slack Webhook] URL verification challenge received')
      return { challenge: body.challenge }
    }

    // ============================================================================
    // VALIDATE EVENT PAYLOAD
    // ============================================================================
    if (!body || body.type !== 'event_callback') {
      logger.debug('[Slack Webhook] Ignoring non-event payload:', body?.type)
      return {
        success: true,
        message: 'Non-event payload ignored',
      }
    }

    if (!body.event) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing event in payload',
      })
    }

    logger.debug('[Slack Webhook] Event type:', body.event.type)
    logger.debug('[Slack Webhook] Event details:', {
      channel: body.event.channel,
      user: body.event.user,
      text: body.event.text?.substring(0, 100),
      ts: body.event.ts,
      thread_ts: body.event.thread_ts,
    })

    // ============================================================================
    // PARSE EVENT WITH SLACK ADAPTER
    // ============================================================================
    const adapter = getAdapter('slack')
    let parsed

    try {
      parsed = await adapter.parseIncoming(body)
      logger.debug('[Slack Webhook] Successfully parsed event:', {
        sourceThreadId: parsed.sourceThreadId,
        teamId: parsed.teamId,
        title: parsed.title,
        authorHandle: parsed.authorHandle,
      })
    } catch (parseError: any) {
      // If it's an unsupported event type (not app_mention), just acknowledge it
      if (parseError.message?.includes('Unsupported event type')) {
        logger.debug('[Slack Webhook] Ignoring unsupported event type:', body.event.type)
        return {
          success: true,
          message: 'Event type not supported',
          event_type: body.event.type,
        }
      }

      // Otherwise, it's a real error
      logger.error('[Slack Webhook] Failed to parse event:', parseError)
      throw createError({
        statusCode: 400,
        statusMessage: 'Failed to parse event',
        data: { error: parseError.message },
      })
    }

    // ============================================================================
    // PROCESS DISCUSSION
    // ============================================================================
    logger.debug('[Slack Webhook] Starting discussion processing...')

    // Use Cloudflare Workers waitUntil to process in background
    // This allows the webhook to return immediately while processing continues
    const cfCtx = event.context.cloudflare?.context

    // In dev mode, NuxtHub provides a mock cfCtx that doesn't properly handle errors.
    // Force synchronous processing in dev to see errors properly.
    // Use import.meta.dev for reliable dev detection (works regardless of BASE_URL)
    const isDevMode = import.meta.dev

    if (cfCtx && !isDevMode) {
      // Production: Process in background using waitUntil
      logger.debug('[Slack Webhook] Using background processing (waitUntil)')

      cfCtx.waitUntil(
        processDiscussion(parsed)
          .then((result) => {
            logger.debug('[Slack Webhook] Background processing completed:', {
              discussionId: result.discussionId,
              taskCount: result.notionTasks.length,
              processingTime: `${result.processingTime}ms`,
              isMultiTask: result.isMultiTask,
            })
          })
          .catch((error) => {
            logger.error('[Slack Webhook] Background processing failed:', error)
            // Error is already logged in processor, job status updated to failed
          })
      )

      // Return immediately
      return {
        success: true,
        message: 'Discussion queued for background processing',
        timestamp: new Date().toISOString(),
      }
    } else {
      // Development: Process synchronously to see errors properly
      logger.info('[Slack Webhook] Using synchronous processing', { isDevMode, hasCloudflareCtx: !!cfCtx })

      let result: ProcessingResult

      try {
        result = await processDiscussion(parsed)

        logger.debug('[Slack Webhook] Discussion processed successfully:', {
          discussionId: result.discussionId,
          taskCount: result.notionTasks.length,
          processingTime: `${result.processingTime}ms`,
          isMultiTask: result.isMultiTask,
        })
      } catch (processingError: any) {
        logger.error('[Slack Webhook] Processing failed:', processingError)

        // Check if error is retryable
        const isRetryable = processingError.retryable === true
        const statusCode = isRetryable ? 503 : 422

        throw createError({
          statusCode,
          statusMessage: 'Processing failed',
          data: {
            error: processingError.message,
            stage: processingError.stage,
            retryable: isRetryable,
          },
        })
      }

      // Return with full result in dev mode
      return {
        success: true,
        discussionId: result.discussionId,
        taskCount: result.notionTasks.length,
        tasks: result.notionTasks.map(t => ({
          id: t.id,
          url: t.url,
        })),
        isMultiTask: result.isMultiTask,
        processingTime: result.processingTime,
        summary: result.aiAnalysis.summary.summary,
        timestamp: new Date().toISOString(),
      }
    }

  } catch (error) {
    // If error was already created by createError above, just rethrow it
    if ((error as any).statusCode) {
      throw error
    }

    // Otherwise, wrap it in a generic 500 error
    logger.error('[Slack Webhook] Unexpected error:', error)
    logger.error('[Slack Webhook] Stack:', (error as Error).stack)

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: { error: (error as Error).message },
    })
  }
})