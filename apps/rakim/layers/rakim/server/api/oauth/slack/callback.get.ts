/**
 * Slack OAuth Callback Endpoint
 *
 * Handles the OAuth 2.0 callback from Slack after user authorization.
 * Exchanges the temporary authorization code for an access token.
 *
 * **Flow (Flows Architecture v2):**
 * 1. Verify state parameter (CSRF protection)
 * 2. Extract authorization code from query params
 * 3. Exchange code for access token via oauth.v2.access
 * 4. Check if team already has a flow with Slack input
 * 5. If yes: Add new input to existing flow
 * 6. If no: Create new flow + first input
 * 7. Clean up state token
 * 8. Redirect to success page
 *
 * Required Environment Variables:
 * - SLACK_CLIENT_ID: Your Slack app's client ID
 * - SLACK_CLIENT_SECRET: Your Slack app's client secret
 * - BASE_URL: Your application's base URL
 *
 * @see https://api.slack.com/methods/oauth.v2.access
 */

/**
 * Slack oauth.v2.access response structure
 */
interface SlackOAuthResponse {
  ok: boolean
  access_token?: string
  token_type?: string
  scope?: string
  bot_user_id?: string
  app_id?: string
  team?: {
    id: string
    name: string
  }
  enterprise?: {
    id: string
    name: string
  }
  authed_user?: {
    id: string
  }
  error?: string
}

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event)
    const code = query.code as string
    const state = query.state as string
    const error = query.error as string

    // Handle authorization denial
    if (error) {
      logger.error('[OAuth] User denied authorization:', error)
      throw createError({
        statusCode: 403,
        statusMessage: `Slack authorization denied: ${error}`,
      })
    }

    // Validate required parameters
    if (!code) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing authorization code',
      })
    }

    if (!state) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing state parameter',
      })
    }

    // Verify state token (CSRF protection) using NuxtHub KV
    const stateData = await hubKV().get<{ teamId: string; flowId?: string; openerOrigin?: string; createdAt: number }>(`oauth:state:${state}`)

    if (!stateData) {
      logger.error('[OAuth] Invalid or expired state token')
      throw createError({
        statusCode: 403,
        statusMessage: 'Invalid or expired authorization request',
      })
    }

    // Extract team ID, optional flow ID, and opener origin from state
    const { teamId, flowId: requestedFlowId, openerOrigin } = stateData

    // Delete state token (single use) from KV
    await hubKV().del(`oauth:state:${state}`)

    // Get environment variables
    const config = useRuntimeConfig(event)
    const clientId = config.slackClientId || process.env.SLACK_CLIENT_ID
    const clientSecret = config.slackClientSecret || process.env.SLACK_CLIENT_SECRET
    const baseUrl = config.public.baseUrl || process.env.BASE_URL || 'http://localhost:3000'

    // Validate required configuration
    if (!clientId || !clientSecret) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Slack OAuth not configured: Missing client credentials',
      })
    }

    // Build redirect URI (must match install.get.ts)
    const redirectUri = `${baseUrl}/api/oauth/slack/callback`

    logger.debug('[OAuth] Exchanging code for access token', {
      teamId,
      codePrefix: code.substring(0, 10) + '...',
    })

    // Exchange authorization code for access token
    // Use POST with form-encoded body as per Slack API requirements
    const tokenUrl = 'https://slack.com/api/oauth.v2.access'
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      logger.error('[OAuth] Token exchange failed:', tokenResponse.status, tokenResponse.statusText)
      throw createError({
        statusCode: 502,
        statusMessage: 'Failed to exchange authorization code',
      })
    }

    const tokenData = await tokenResponse.json() as SlackOAuthResponse

    if (!tokenData.ok || !tokenData.access_token) {
      logger.error('[OAuth] Token exchange error:', tokenData.error)
      throw createError({
        statusCode: 502,
        statusMessage: `Slack OAuth error: ${tokenData.error || 'Unknown error'}`,
      })
    }

    logger.debug('[OAuth] Successfully obtained access token', {
      teamId,
      slackTeamId: tokenData.team?.id,
      slackTeamName: tokenData.team?.name,
      botUserId: tokenData.bot_user_id,
      scopes: tokenData.scope,
    })

    // ============================================================================
    // CREATE/UPDATE FLOW + INPUT
    // ============================================================================
    const slackTeamId = tokenData.team?.id || ''
    const slackTeamName = tokenData.team?.name || 'Slack Workspace'
    const accessToken = tokenData.access_token

    // Import database and queries
    const { getAllDiscubotFlows, createDiscubotFlow, getDiscubotFlowById } = await import(
      '#layers/discubot/collections/flows/server/database/queries'
    )
    const { getAllDiscubotFlowInputs, createDiscubotFlowInput } = await import(
      '#layers/discubot/collections/flowinputs/server/database/queries'
    )
    const { SYSTEM_USER_ID } = await import('#layers/discubot/server/utils/constants')

    // Determine which flow to add the input to
    let flowId: string
    let isNewFlow = false

    if (requestedFlowId) {
      // If specific flowId was provided, try to use that one
      try {
        const requestedFlow = await getDiscubotFlowById(requestedFlowId, teamId)
        flowId = requestedFlowId
        logger.debug('[OAuth] Using requested flow', { flowId, flowName: requestedFlow.name })
      } catch {
        // Requested flow doesn't exist, fall back to first flow or create new
        logger.warn('[OAuth] Requested flow not found, falling back', { requestedFlowId })
        const existingFlows = await getAllDiscubotFlows(teamId)
        if (existingFlows && existingFlows.length > 0) {
          flowId = existingFlows[0].id
          logger.debug('[OAuth] Using first existing flow', { flowId, flowName: existingFlows[0].name })
        } else {
          // Create new flow
          const newFlow = await createDiscubotFlow({
            name: `${slackTeamName} Flow`,
            description: 'Created via Slack OAuth',
            availableDomains: ['design', 'frontend', 'backend', 'product'],
            aiEnabled: true,
            aiSummaryPrompt: null,
            aiTaskPrompt: null,
            anthropicApiKey: null,
            onboardingComplete: false,
            active: true,
            teamId,
            owner: SYSTEM_USER_ID,
            createdBy: SYSTEM_USER_ID,
            updatedBy: SYSTEM_USER_ID,
          })
          flowId = newFlow.id
          isNewFlow = true
          logger.info('[OAuth] Created new flow', { flowId, flowName: newFlow.name })
        }
      }
    } else {
      // No specific flow requested - use first existing or create new (backward compatible)
      const existingFlows = await getAllDiscubotFlows(teamId)
      if (existingFlows && existingFlows.length > 0) {
        flowId = existingFlows[0].id
        logger.debug('[OAuth] Using first existing flow', { flowId, flowName: existingFlows[0].name })
      } else {
        // Create new flow with default settings
        const newFlow = await createDiscubotFlow({
          name: `${slackTeamName} Flow`,
          description: 'Created via Slack OAuth',
          availableDomains: ['design', 'frontend', 'backend', 'product'],
          aiEnabled: true,
          aiSummaryPrompt: null,
          aiTaskPrompt: null,
          anthropicApiKey: null,
          onboardingComplete: false,
          active: true,
          teamId,
          owner: SYSTEM_USER_ID,
          createdBy: SYSTEM_USER_ID,
          updatedBy: SYSTEM_USER_ID,
        })
        flowId = newFlow.id
        isNewFlow = true
        logger.info('[OAuth] Created new flow', { flowId, flowName: newFlow.name })
      }
    }

    // Check if this Slack workspace is already connected (by slackTeamId)
    const allInputs = await getAllDiscubotFlowInputs(teamId)
    const existingInputs = allInputs?.filter(input => input.flowId === flowId) || []
    const duplicateInput = existingInputs.find(input =>
      input.sourceType === 'slack' &&
      input.sourceMetadata?.slackTeamId === slackTeamId
    )

    if (duplicateInput) {
      logger.warn('[OAuth] Slack workspace already connected to this flow', {
        flowId,
        slackTeamId,
        inputId: duplicateInput.id,
      })

      // Redirect to success with warning
      const successUrl = new URL('/oauth/success', baseUrl)
      successUrl.searchParams.set('provider', 'slack')
      successUrl.searchParams.set('status', 'already-connected')
      successUrl.searchParams.set('flow_id', flowId)
      successUrl.searchParams.set('team_name', slackTeamName)
      if (openerOrigin) {
        successUrl.searchParams.set('opener_origin', openerOrigin)
      }

      return sendRedirect(event, successUrl.toString(), 302)
    }

    // Create new Slack input
    const newInput = await createDiscubotFlowInput({
      flowId,
      sourceType: 'slack',
      name: slackTeamName,
      apiToken: accessToken,
      webhookUrl: null, // Generated by Slack Events API
      webhookSecret: null,
      emailAddress: null,
      emailSlug: null,
      sourceMetadata: {
        slackTeamId,
        slackTeamName,
        botUserId: tokenData.bot_user_id || '',
        scopes: tokenData.scope || '',
      },
      active: true,
      teamId,
      owner: SYSTEM_USER_ID,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    })

    logger.info('[OAuth] Created Slack input', {
      flowId,
      inputId: newInput.id,
      slackTeamId,
      isNewFlow,
    })

    // Redirect to success page
    const successUrl = new URL('/oauth/success', baseUrl)
    successUrl.searchParams.set('provider', 'slack')
    successUrl.searchParams.set('status', 'success')
    successUrl.searchParams.set('flow_id', flowId)
    successUrl.searchParams.set('input_id', newInput.id)
    successUrl.searchParams.set('team_name', slackTeamName)
    successUrl.searchParams.set('is_new_flow', isNewFlow.toString())
    if (openerOrigin) {
      successUrl.searchParams.set('opener_origin', openerOrigin)
    }

    return sendRedirect(event, successUrl.toString(), 302)
  }
  catch (error) {
    logger.error('[OAuth] Callback handler failed:', error)

    // If it's already a createError, rethrow it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    // Otherwise, return generic error
    throw createError({
      statusCode: 500,
      statusMessage: 'OAuth callback failed',
    })
  }
})
