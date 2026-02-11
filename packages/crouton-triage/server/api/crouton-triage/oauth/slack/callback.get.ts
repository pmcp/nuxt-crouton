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

import { kv } from 'hub:kv'

/**
 * Return an HTML page that sends OAuth result back to the opener via postMessage,
 * then closes the popup. If no opener, shows a simple success/error message.
 */
function oauthResultHtml(data: {
  type: 'oauth-success' | 'oauth-error'
  credentials?: Record<string, any>
  error?: string
  openerOrigin?: string
  provider: string
  status: string
  teamName?: string
}) {
  const message = JSON.stringify({
    type: data.type,
    credentials: data.credentials,
    error: data.error,
    provider: data.provider,
    status: data.status,
  })
  const origin = data.openerOrigin || '*'
  const title = data.type === 'oauth-success'
    ? `${data.teamName || data.provider} connected successfully!`
    : `Connection failed: ${data.error || 'Unknown error'}`

  return `<!DOCTYPE html>
<html><head><title>OAuth - ${data.provider}</title></head>
<body>
<p>${title}</p>
<p>You can close this window.</p>
<script>
  if (window.opener) {
    window.opener.postMessage(${message}, '${origin}');
    window.close();
  }
</script>
</body></html>`
}

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
    const stateData = await kv.get<{ teamId: string; flowId?: string; openerOrigin?: string; createdAt: number }>(`oauth:state:${state}`)

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
    await kv.del(`oauth:state:${state}`)

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
    const redirectUri = `${baseUrl}/api/crouton-triage/oauth/slack/callback`

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
    const { getAllTriageFlows, createTriageFlow, getTriageFlowById } = await import(
      '~~/layers/triage/collections/flows/server/database/queries'
    )
    const { getAllTriageInputs, createTriageInput, updateTriageInput } = await import(
      '~~/layers/triage/collections/inputs/server/database/queries'
    )
    const { getAllTriageAccounts, createTriageAccount, updateTriageAccount } = await import(
      '~~/layers/triage/collections/accounts/server/database/queries'
    )
    const { SYSTEM_USER_ID } = await import('../../../../utils/constants')

    // ============================================================================
    // CREATE OR UPDATE CONNECTED ACCOUNT
    // ============================================================================
    // Check if an account already exists for this Slack workspace + team
    const allAccounts = await getAllTriageAccounts(teamId)
    const existingAccount = allAccounts?.find(
      (a: any) => a.provider === 'slack' && a.providerAccountId === slackTeamId
    )

    let accountId: string

    if (existingAccount) {
      // Re-auth: update the existing account's token
      const encryptedToken = await encryptSecret(accessToken)
      const tokenHint = maskSecret(accessToken)

      await updateTriageAccount(existingAccount.id, teamId, SYSTEM_USER_ID, {
        accessToken: encryptedToken,
        accessTokenHint: tokenHint,
        scopes: tokenData.scope || '',
        status: 'connected',
        lastVerifiedAt: new Date(),
        providerMetadata: {
          ...(existingAccount.providerMetadata || {}),
          slackTeamName,
          botUserId: tokenData.bot_user_id || '',
        },
      })

      accountId = existingAccount.id
      logger.info('[OAuth] Updated existing account', { accountId, slackTeamId })
    } else {
      // New account
      const encryptedToken = await encryptSecret(accessToken)
      const tokenHint = maskSecret(accessToken)

      const newAccount = await createTriageAccount({
        provider: 'slack',
        label: slackTeamName,
        providerAccountId: slackTeamId,
        accessToken: encryptedToken,
        accessTokenHint: tokenHint,
        refreshToken: null,
        tokenExpiresAt: null,
        scopes: tokenData.scope || '',
        providerMetadata: {
          slackTeamName,
          botUserId: tokenData.bot_user_id || '',
        },
        status: 'connected',
        lastVerifiedAt: new Date(),
        teamId,
        owner: SYSTEM_USER_ID,
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID,
      })

      accountId = newAccount.id
      logger.info('[OAuth] Created new account', { accountId, slackTeamId })
    }

    // Determine which flow to add the input to
    let flowId: string
    let isNewFlow = false

    if (requestedFlowId) {
      // If specific flowId was provided, try to use that one
      try {
        const requestedFlow = await getTriageFlowById(requestedFlowId, teamId)
        flowId = requestedFlowId
        logger.debug('[OAuth] Using requested flow', { flowId, flowName: requestedFlow.name })
      } catch {
        // Requested flow doesn't exist, fall back to first flow or create new
        logger.warn('[OAuth] Requested flow not found, falling back', { requestedFlowId })
        const existingFlows = await getAllTriageFlows(teamId)
        if (existingFlows && existingFlows.length > 0) {
          flowId = existingFlows[0].id
          logger.debug('[OAuth] Using first existing flow', { flowId, flowName: existingFlows[0].name })
        } else {
          // Create new flow
          const newFlow = await createTriageFlow({
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
      const existingFlows = await getAllTriageFlows(teamId)
      if (existingFlows && existingFlows.length > 0) {
        flowId = existingFlows[0].id
        logger.debug('[OAuth] Using first existing flow', { flowId, flowName: existingFlows[0].name })
      } else {
        // Create new flow with default settings
        const newFlow = await createTriageFlow({
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
    const allInputs = await getAllTriageInputs(teamId)
    const existingInputs = allInputs?.filter(input => input.flowId === flowId) || []
    const duplicateInput = existingInputs.find(input =>
      input.sourceType === 'slack' &&
      input.sourceMetadata?.slackTeamId === slackTeamId
    )

    if (duplicateInput) {
      // Auto-migrate: if the input has an inline apiToken but no accountId, migrate it
      if (duplicateInput.apiToken && !duplicateInput.accountId) {
        logger.info('[OAuth] Auto-migrating duplicate input to use accountId', {
          inputId: duplicateInput.id,
          accountId,
        })
        await updateTriageInput(duplicateInput.id, teamId, SYSTEM_USER_ID, {
          accountId,
          apiToken: null, // Clear inline token
        })
      } else if (!duplicateInput.accountId) {
        // Link to account even if no inline token
        await updateTriageInput(duplicateInput.id, teamId, SYSTEM_USER_ID, {
          accountId,
        })
      }

      // Return success page (postMessage to opener popup)
      setResponseHeader(event, 'content-type', 'text/html')
      return oauthResultHtml({
        type: 'oauth-success',
        credentials: { accountId, flowId, inputId: duplicateInput.id },
        openerOrigin,
        provider: 'slack',
        status: 'already-connected',
        teamName: slackTeamName,
      })
    }

    // Create new Slack input — references account by ID instead of storing inline token
    const newInput = await createTriageInput({
      flowId,
      sourceType: 'slack',
      name: slackTeamName,
      apiToken: null, // No inline token — uses accountId
      accountId,
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

    // Return success page (postMessage to opener popup)
    setResponseHeader(event, 'content-type', 'text/html')
    return oauthResultHtml({
      type: 'oauth-success',
      credentials: { accountId, flowId, inputId: newInput.id },
      openerOrigin,
      provider: 'slack',
      status: 'success',
      teamName: slackTeamName,
    })
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
