/**
 * Notion Input Webhook Endpoint
 *
 * Receives Notion Webhooks API events and processes them through the discussion pipeline.
 *
 * Flow:
 * 1. URL verification challenge -> Return verification_token
 * 2. comment.created events -> Fetch comment -> Check trigger -> Process discussion
 * 3. Other events -> Ignore
 *
 * **Flows Support (Phase 5):**
 * - Automatically finds flow by workspace_id (from webhook payload)
 * - Falls back to legacy config if no flow found
 * - Flow routing handled by processor service
 *
 * @see https://developers.notion.com/reference/webhooks
 */

import crypto from 'node:crypto'
import { getAdapter } from '#layers/discubot/server/adapters'
import { processDiscussion } from '#layers/discubot/server/services/processor'
import type { ProcessingResult } from '#layers/discubot/server/services/processor'
import {
  fetchComment,
  checkForTrigger,
  DEFAULT_TRIGGER_KEYWORD,
  type NotionWebhookPayload,
} from '#layers/discubot/server/adapters/notion'
import { logger } from '#layers/discubot/server/utils/logger'

/**
 * Replay attack prevention window (5 minutes)
 */
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000

/**
 * Verify Notion webhook signature
 *
 * Notion signs webhooks using HMAC-SHA256 with the webhook signing secret.
 * The signature is sent in the `X-Notion-Signature` header.
 *
 * Algorithm:
 * 1. Extract signature from header
 * 2. Compute expected signature: HMAC-SHA256(signingSecret, rawBody)
 * 3. Compare using constant-time comparison
 *
 * @param rawBody - Raw request body string (not parsed JSON)
 * @param signature - Signature from X-Notion-Signature header
 * @param signingSecret - Notion webhook signing secret (from environment)
 * @returns true if signature is valid, false otherwise
 */
function verifyNotionSignature(
  rawBody: string,
  signature: string,
  signingSecret: string,
): boolean {
  try {
    if (!signature || !signingSecret) {
      logger.warn('[Notion Webhook] Missing signature or signing secret')
      return false
    }

    // Compute expected signature using HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', signingSecret)
      .update(rawBody)
      .digest('hex')

    // Prefix with v1= if Notion uses that format (adjust based on actual Notion format)
    // Notion may use formats like: v1=<signature> or just <signature>
    const signatureToCompare = signature.startsWith('v1=')
      ? signature.slice(3)
      : signature

    // Ensure same length for timing-safe comparison
    if (signatureToCompare.length !== expectedSignature.length) {
      logger.warn('[Notion Webhook] Signature length mismatch')
      return false
    }

    // Compare using constant-time comparison (prevent timing attacks)
    return crypto.timingSafeEqual(
      Buffer.from(signatureToCompare, 'utf8'),
      Buffer.from(expectedSignature, 'utf8'),
    )
  }
  catch (error) {
    logger.error('[Notion Webhook] Error verifying signature:', error)
    return false
  }
}

/**
 * Validate webhook timestamp to prevent replay attacks
 *
 * @param timestamp - ISO timestamp string from webhook payload
 * @returns true if timestamp is within tolerance window
 */
function validateTimestamp(timestamp: string | undefined): boolean {
  if (!timestamp) {
    return true // Allow if no timestamp (some events may not have it)
  }

  try {
    const eventTime = new Date(timestamp).getTime()
    const currentTime = Date.now()
    const timeDiff = Math.abs(currentTime - eventTime)

    if (timeDiff > TIMESTAMP_TOLERANCE_MS) {
      logger.warn('[Notion Webhook] Request timestamp outside tolerance window', {
        eventTime: new Date(eventTime).toISOString(),
        currentTime: new Date(currentTime).toISOString(),
        diffMinutes: (timeDiff / 60000).toFixed(2),
      })
      return false
    }

    return true
  }
  catch {
    logger.warn('[Notion Webhook] Failed to parse timestamp', { timestamp })
    return true // Allow on parse failure
  }
}

/**
 * Simple rate limiting using in-memory map
 * In production, consider using Redis or Cloudflare KV
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60 // 60 requests per minute per workspace

function checkRateLimit(workspaceId: string): boolean {
  const now = Date.now()
  const key = `notion:${workspaceId}`
  const record = requestCounts.get(key)

  if (!record || now > record.resetTime) {
    // Reset or create new record
    requestCounts.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    logger.warn('[Notion Webhook] Rate limit exceeded', {
      workspaceId,
      count: record.count,
    })
    return false
  }

  record.count++
  return true
}

export default defineEventHandler(async (event) => {
  logger.debug('[Notion Webhook] ===== REQUEST RECEIVED =====')
  logger.debug('[Notion Webhook] Method:', event.method)
  logger.debug('[Notion Webhook] Path:', event.path)

  try {
    // ============================================================================
    // READ RAW BODY FOR SIGNATURE VERIFICATION
    // ============================================================================
    const rawBody = await readRawBody(event)

    if (!rawBody) {
      logger.warn('[Notion Webhook] Empty request body')
      // Return 200 to prevent retries
      return {
        success: false,
        message: 'Empty request body',
      }
    }

    // Parse JSON body
    let body: NotionWebhookPayload & { verification_token?: string }
    try {
      body = JSON.parse(rawBody)
    }
    catch {
      logger.warn('[Notion Webhook] Invalid JSON body')
      return {
        success: false,
        message: 'Invalid JSON body',
      }
    }

    logger.info('[Notion Webhook] Payload type:', body?.type)
    logger.info('[Notion Webhook] Payload keys:', Object.keys(body || {}))
    logger.info('[Notion Webhook] body.entity:', JSON.stringify(body?.entity, null, 2))
    logger.info('[Notion Webhook] body.data:', JSON.stringify(body?.data, null, 2))

    // ============================================================================
    // HANDLE URL VERIFICATION CHALLENGE
    // Notion sends: { "verification_token": "secret_..." } without a type field
    // ============================================================================
    if (body && body.verification_token && !body.type) {
      logger.info('[Notion Webhook] URL verification challenge received')
      logger.info('[Notion Webhook] ✅ VERIFICATION TOKEN:', body.verification_token)
      logger.info('[Notion Webhook] Copy this token and paste it into Notion\'s verification form')

      // Echo back the verification token
      return {
        verification_token: body.verification_token,
      }
    }

    // Also handle if Notion adds a type field in the future
    if (body && body.type === 'url_verification' && body.verification_token) {
      logger.info('[Notion Webhook] URL verification challenge received (with type)')
      logger.info('[Notion Webhook] ✅ VERIFICATION TOKEN:', body.verification_token)

      return {
        verification_token: body.verification_token,
      }
    }

    // ============================================================================
    // VERIFY WEBHOOK SIGNATURE
    // ============================================================================
    const config = useRuntimeConfig()
    const signingSecret = config.notionWebhookSecret as string | undefined

    // Only verify signature if signing secret is configured
    if (signingSecret) {
      const signature = getHeader(event, 'x-notion-signature')
        || getHeader(event, 'X-Notion-Signature')

      if (!signature) {
        logger.warn('[Notion Webhook] Missing X-Notion-Signature header')
        // Return 200 to prevent retries, but log the issue
        return {
          success: false,
          message: 'Missing signature header',
        }
      }

      if (!verifyNotionSignature(rawBody, signature, signingSecret)) {
        logger.warn('[Notion Webhook] Invalid signature')
        return {
          success: false,
          message: 'Invalid signature',
        }
      }

      logger.debug('[Notion Webhook] Signature verified successfully')
    }
    else {
      logger.warn('[Notion Webhook] No signing secret configured - skipping signature verification')
    }

    // ============================================================================
    // VALIDATE TIMESTAMP (Replay Attack Prevention)
    // ============================================================================
    if (!validateTimestamp(body.timestamp)) {
      return {
        success: false,
        message: 'Request timestamp outside tolerance window',
      }
    }

    // ============================================================================
    // RATE LIMITING
    // ============================================================================
    const workspaceId = body.workspace_id || 'unknown'
    if (!checkRateLimit(workspaceId)) {
      // Return 429 for rate limiting
      setResponseStatus(event, 429)
      return {
        success: false,
        message: 'Rate limit exceeded',
      }
    }

    // ============================================================================
    // VALIDATE EVENT TYPE
    // ============================================================================
    if (body.type !== 'comment.created') {
      logger.debug('[Notion Webhook] Ignoring non-comment event:', body.type)
      return {
        success: true,
        message: `Event type '${body.type}' ignored (only 'comment.created' is processed)`,
      }
    }

    // ============================================================================
    // VALIDATE PAYLOAD STRUCTURE
    // Notion webhook structure (as of 2024):
    // - body.entity.id = comment ID
    // - body.entity.type = "comment"
    // - body.data.parent.id = page/block ID
    // - body.data.parent.type = "page" | "block"
    // ============================================================================
    const commentId = body.entity?.id
    const parentId = body.data?.parent?.id || body.data?.page_id
    const parentType = body.data?.parent?.type || 'page'

    if (!commentId) {
      logger.warn('[Notion Webhook] Invalid comment.created payload - missing comment ID in entity')
      return {
        success: false,
        message: 'Invalid payload structure - missing entity.id',
      }
    }

    if (!parentId) {
      logger.warn('[Notion Webhook] Missing parent ID in payload')
      return {
        success: false,
        message: 'Missing parent ID',
      }
    }

    const integrationId = body.integration_id
    logger.info('[Notion Webhook] Comment event details:', {
      commentId,
      parentId,
      parentType,
      workspaceId,
      integrationId,
    })

    // ============================================================================
    // FETCH COMMENT CONTENT AND CHECK FOR TRIGGER
    // ============================================================================
    // We need to fetch the comment to check its content for the trigger keyword
    // First, we need to find the appropriate config/flow to get the API token

    // Try to find a flow input for this Notion workspace
    const db = useDB()
    const { discubotFlowinputs } = await import(
      '#layers/discubot/collections/flowinputs/server/database/schema'
    )
    const { discubotFlows } = await import(
      '#layers/discubot/collections/flows/server/database/schema'
    )
    const { eq, and } = await import('drizzle-orm')

    // Query for Notion inputs
    const inputs = await db
      .select()
      .from(discubotFlowinputs)
      .where(and(
        eq(discubotFlowinputs.sourceType, 'notion'),
        eq(discubotFlowinputs.active, true),
      ))
      .all()

    // Find matching input by workspace ID (stored in sourceMetadata)
    // Fallback: if no workspace ID stored, match any active Notion input with a valid token
    let matchedInput: typeof inputs[0] | undefined
    let matchedFlow: any

    // First try: match by workspace ID
    for (const input of inputs) {
      const inputWorkspaceId = input.sourceMetadata?.notionWorkspaceId
      if (inputWorkspaceId === workspaceId) {
        // Verify the flow exists and is active
        const [flow] = await db
          .select()
          .from(discubotFlows)
          .where(and(
            eq(discubotFlows.id, input.flowId),
            eq(discubotFlows.active, true),
          ))
          .limit(1)

        if (flow) {
          matchedInput = input
          matchedFlow = flow
          logger.info('[Notion Webhook] Matched input by workspace ID', {
            inputId: input.id,
            workspaceId,
          })
          break
        }
      }
    }

    // Fallback: if no workspace match, only use fallback if there's exactly ONE Notion input with a token
    // This prevents accidentally matching the wrong workspace when multiple are configured
    if (!matchedInput) {
      logger.info('[Notion Webhook] No workspace ID match, checking for unambiguous fallback...')

      // Find all inputs with tokens and active flows
      const inputsWithTokens: Array<{ input: typeof inputs[0]; flow: any }> = []

      for (const input of inputs) {
        const hasToken = input.sourceMetadata?.notionToken || input.apiToken
        if (hasToken) {
          const [flow] = await db
            .select()
            .from(discubotFlows)
            .where(and(
              eq(discubotFlows.id, input.flowId),
              eq(discubotFlows.active, true),
            ))
            .limit(1)

          if (flow) {
            inputsWithTokens.push({ input, flow })
          }
        }
      }

      if (inputsWithTokens.length === 1) {
        // Unambiguous - only one option
        matchedInput = inputsWithTokens[0].input
        matchedFlow = inputsWithTokens[0].flow
        logger.info('[Notion Webhook] Matched input by unambiguous fallback (single input with token)', {
          inputId: matchedInput.id,
          inputName: matchedInput.name,
        })
      } else if (inputsWithTokens.length > 1) {
        // Multiple inputs found - try to match by integration_id if stored
        for (const { input, flow } of inputsWithTokens) {
          if (input.sourceMetadata?.notionIntegrationId === integrationId) {
            matchedInput = input
            matchedFlow = flow
            logger.info('[Notion Webhook] Matched input by integration ID', {
              inputId: input.id,
              integrationId,
            })
            break
          }
        }

        // Still no match - use first one with warning (for development/testing)
        if (!matchedInput) {
          logger.warn('[Notion Webhook] Multiple Notion inputs found, using first one (configure workspace/integration ID for precise matching)', {
            workspaceId,
            integrationId,
            inputCount: inputsWithTokens.length,
            inputNames: inputsWithTokens.map(i => i.input.name),
            selectedInput: inputsWithTokens[0].input.name,
          })
          matchedInput = inputsWithTokens[0].input
          matchedFlow = inputsWithTokens[0].flow
        }
      }
    }

    if (!matchedInput || !matchedFlow) {
      logger.warn('[Notion Webhook] No active flow found for workspace', {
        workspaceId,
        availableInputs: inputs.length,
      })
      // Return 200 to prevent retries
      return {
        success: false,
        message: `No active flow configured for workspace: ${workspaceId}`,
      }
    }

    logger.debug('[Notion Webhook] Found matching flow', {
      flowId: matchedFlow.id,
      flowName: matchedFlow.name,
      inputId: matchedInput.id,
    })

    // Auto-capture workspace/integration IDs if not already stored
    // This enables user mapping to work for Notion inputs
    const needsWorkspaceUpdate = !matchedInput.sourceMetadata?.notionWorkspaceId && workspaceId !== 'unknown'
    const needsIntegrationUpdate = !matchedInput.sourceMetadata?.notionIntegrationId && integrationId

    if (needsWorkspaceUpdate || needsIntegrationUpdate) {
      logger.info('[Notion Webhook] Auto-capturing workspace/integration IDs', {
        inputId: matchedInput.id,
        workspaceId: needsWorkspaceUpdate ? workspaceId : 'already set',
        integrationId: needsIntegrationUpdate ? integrationId : 'already set',
      })

      const updatedMetadata = {
        ...matchedInput.sourceMetadata,
        ...(needsWorkspaceUpdate && { notionWorkspaceId: workspaceId }),
        ...(needsIntegrationUpdate && { notionIntegrationId: integrationId }),
      }

      await db
        .update(discubotFlowinputs)
        .set({
          sourceMetadata: updatedMetadata,
          updatedAt: new Date(),
        })
        .where(eq(discubotFlowinputs.id, matchedInput.id))

      // Update local reference for this request
      matchedInput.sourceMetadata = updatedMetadata

      logger.info('[Notion Webhook] Workspace/integration IDs captured successfully')
    }

    // Get API token from flow input (can be in apiToken or sourceMetadata.notionToken)
    const apiToken = matchedInput.apiToken || matchedInput.sourceMetadata?.notionToken
    if (!apiToken) {
      logger.warn('[Notion Webhook] No API token configured for input', {
        inputId: matchedInput.id,
        hasApiToken: !!matchedInput.apiToken,
        hasSourceMetadataToken: !!matchedInput.sourceMetadata?.notionToken,
      })
      return {
        success: false,
        message: 'No API token configured',
      }
    }

    logger.info('[Notion Webhook] Using API token from input', {
      inputId: matchedInput.id,
      tokenSource: matchedInput.apiToken ? 'apiToken' : 'sourceMetadata.notionToken',
    })

    // Fetch the comment to get its content
    const comment = await fetchComment(commentId, apiToken)
    if (!comment) {
      logger.warn('[Notion Webhook] Failed to fetch comment', {
        commentId,
        parentId,
      })
      return {
        success: false,
        message: 'Failed to fetch comment content',
      }
    }

    // Check for trigger keyword
    const triggerKeyword = matchedInput.sourceMetadata?.triggerKeyword || DEFAULT_TRIGGER_KEYWORD
    logger.info('[Notion Webhook] Checking for trigger keyword', {
      triggerKeyword,
      commentTextPreview: comment.rich_text?.map(r => r.plain_text).join('').substring(0, 100),
    })
    const hasTrigger = checkForTrigger(comment.rich_text, triggerKeyword)

    if (!hasTrigger) {
      logger.info('[Notion Webhook] No trigger keyword found in comment', {
        commentId,
        triggerKeyword,
      })
      return {
        success: true,
        message: `Comment does not contain trigger keyword '${triggerKeyword}'`,
      }
    }

    logger.info('[Notion Webhook] Trigger keyword found - processing comment', {
      commentId,
      triggerKeyword,
    })

    // ============================================================================
    // PARSE EVENT WITH NOTION ADAPTER
    // ============================================================================
    const adapter = getAdapter('notion')

    // Build a minimal config for parsing
    const sourceConfig = {
      id: matchedInput.id,
      teamId: matchedFlow.teamId,
      sourceType: 'notion' as const,
      apiToken,
      sourceMetadata: matchedInput.sourceMetadata,
    }

    let parsed
    try {
      parsed = await adapter.parseIncoming(body, sourceConfig)

      // Override teamId with the actual team from the matched flow
      // (the adapter returns workspace_id which is not the correct team ID)
      parsed.teamId = matchedFlow.teamId

      // Add workspace ID to metadata for flow lookup in processor
      parsed.metadata = {
        ...parsed.metadata,
        notionWorkspaceId: workspaceId,
      }

      logger.info('[Notion Webhook] Successfully parsed event:', {
        sourceThreadId: parsed.sourceThreadId,
        teamId: parsed.teamId,
        title: parsed.title,
        authorHandle: parsed.authorHandle,
      })
    }
    catch (parseError: any) {
      logger.error('[Notion Webhook] Failed to parse event:', parseError)
      return {
        success: false,
        message: 'Failed to parse event',
        error: parseError.message,
      }
    }

    // ============================================================================
    // PROCESS DISCUSSION
    // ============================================================================
    logger.debug('[Notion Webhook] Starting discussion processing...')

    // Use Cloudflare Workers waitUntil to process in background
    const cfCtx = event.context.cloudflare?.context
    const isDevMode = import.meta.dev

    if (cfCtx && !isDevMode) {
      // Production: Process in background using waitUntil
      logger.debug('[Notion Webhook] Using background processing (waitUntil)')

      cfCtx.waitUntil(
        processDiscussion(parsed)
          .then((result) => {
            logger.debug('[Notion Webhook] Background processing completed:', {
              discussionId: result.discussionId,
              taskCount: result.notionTasks.length,
              processingTime: `${result.processingTime}ms`,
              isMultiTask: result.isMultiTask,
            })
          })
          .catch((error) => {
            logger.error('[Notion Webhook] Background processing failed:', error)
          }),
      )

      // Return immediately
      return {
        success: true,
        message: 'Discussion queued for background processing',
        timestamp: new Date().toISOString(),
      }
    }
    else {
      // Development: Process synchronously to see errors properly
      logger.info('[Notion Webhook] Using synchronous processing', {
        isDevMode,
        hasCloudflareCtx: !!cfCtx,
      })

      let result: ProcessingResult

      try {
        result = await processDiscussion(parsed)

        logger.debug('[Notion Webhook] Discussion processed successfully:', {
          discussionId: result.discussionId,
          taskCount: result.notionTasks.length,
          processingTime: `${result.processingTime}ms`,
          isMultiTask: result.isMultiTask,
        })
      }
      catch (processingError: any) {
        logger.error('[Notion Webhook] Processing failed:', processingError)

        // Return 200 even on errors to prevent Notion retries
        // The error is logged for debugging
        return {
          success: false,
          message: 'Processing failed',
          error: processingError.message,
          timestamp: new Date().toISOString(),
        }
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
  }
  catch (error) {
    // Log the error but return 200 to prevent Notion retries
    logger.error('[Notion Webhook] Unexpected error:', error)
    logger.error('[Notion Webhook] Stack:', (error as Error).stack)

    return {
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    }
  }
})
