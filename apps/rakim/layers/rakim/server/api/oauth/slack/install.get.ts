/**
 * Slack OAuth Install Endpoint
 *
 * Initiates the Slack OAuth 2.0 authorization flow.
 * Redirects users to Slack's authorization page where they can install the app.
 *
 * Flow:
 * 1. Generate secure random state token (CSRF protection)
 * 2. Store state token with expiration (5 minutes)
 * 3. Build Slack authorization URL with required scopes
 * 4. Redirect user to Slack for authorization
 *
 * Required Environment Variables:
 * - SLACK_CLIENT_ID: Your Slack app's client ID
 * - SLACK_CLIENT_SECRET: Your Slack app's client secret
 * - BASE_URL: Your application's base URL (for redirect_uri)
 *
 * @see https://api.slack.com/authentication/oauth-v2
 */

import { randomBytes } from 'node:crypto'

/**
 * Required Slack OAuth scopes for the bot
 *
 * Scopes needed:
 * - channels:history: Read messages in public channels
 * - channels:read: View basic channel info
 * - chat:write: Post messages as the bot
 * - reactions:write: Add emoji reactions to messages
 * - app_mentions:read: Receive @mentions of the bot
 * - im:history: Read direct messages
 * - im:read: View direct message info
 * - im:write: Send direct messages
 * - mpim:history: Read group direct messages
 * - mpim:read: View group direct message info
 * - mpim:write: Send group direct messages
 * - users:read: List workspace members for user mapping
 * - users:read.email: Get member emails for auto-matching with Notion users
 */
const SLACK_SCOPES = [
  'channels:history',
  'channels:read',
  'chat:write',
  'reactions:write',
  'app_mentions:read',
  'im:history',
  'im:read',
  'im:write',
  'mpim:history',
  'mpim:read',
  'mpim:write',
  'users:read',
  'users:read.email',
].join(',')

export default defineEventHandler(async (event) => {
  try {
    // Get environment variables
    const config = useRuntimeConfig(event)
    const clientId = config.slackClientId || process.env.SLACK_CLIENT_ID
    const baseUrl = config.public.baseUrl || process.env.BASE_URL || 'http://localhost:3000'

    // Validate required configuration
    if (!clientId) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Slack OAuth not configured: Missing SLACK_CLIENT_ID',
      })
    }

    // Get team ID, flow ID, and opener origin from query params
    const query = getQuery(event)
    const teamId = (query.teamId as string) || (query.team_id as string) || 'default'
    const flowId = query.flowId as string | undefined
    const openerOrigin = query.openerOrigin as string | undefined

    // Generate secure random state token (32 bytes = 256 bits)
    const state = randomBytes(32).toString('hex')

    // Store state token with team ID, flow ID, and opener origin in NuxtHub KV
    // TTL of 300 seconds (5 minutes) for automatic cleanup
    await hubKV().set(`oauth:state:${state}`, {
      teamId,
      flowId, // Optional: if provided, input will be added to this specific flow
      openerOrigin, // For postMessage back to parent window
      createdAt: Date.now(),
    }, {
      ttl: 300, // 5 minutes
    })

    // Build redirect URI (must match what's configured in Slack app settings)
    const redirectUri = `${baseUrl}/api/oauth/slack/callback`

    // Build Slack authorization URL
    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize')
    slackAuthUrl.searchParams.set('client_id', clientId)
    slackAuthUrl.searchParams.set('scope', SLACK_SCOPES)
    slackAuthUrl.searchParams.set('state', state)
    slackAuthUrl.searchParams.set('redirect_uri', redirectUri)

    // Optional: Add user scopes if needed (for actions on behalf of users)
    // slackAuthUrl.searchParams.set('user_scope', 'users:read')

    logger.debug('[OAuth] Initiating Slack OAuth flow', {
      teamId,
      flowId: flowId || 'auto-detect',
      state: state.substring(0, 8) + '...',
      redirectUri,
    })

    // Redirect to Slack authorization page
    return sendRedirect(event, slackAuthUrl.toString(), 302)
  }
  catch (error) {
    logger.error('[OAuth] Failed to initiate Slack OAuth flow:', error)

    // Return user-friendly error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to initiate Slack authorization',
    })
  }
})

/**
 * Export for testing (KV-based storage doesn't need exports)
 *
 * Note: State is now stored in NuxtHub KV with automatic TTL cleanup.
 * For testing, mock hubKV() calls instead of using exported Map.
 */
