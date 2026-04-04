/**
 * Runtime configuration for the ThinkGraph Pi Worker.
 * Reads from environment variables (loaded via dotenv).
 */

export interface WorkerConfig {
  /** ThinkGraph server URL */
  thinkgraphUrl: string
  /** Team slug or ID to watch */
  teamId: string
  /** Service token for API calls and WebSocket auth */
  serviceToken: string
  /** Working directory for agent sessions */
  workDir: string
  /** Max concurrent agent sessions */
  maxSessions: number
  /** Session persistence directory */
  sessionDir: string
  /** LLM model to use */
  model: string
  /** Collab worker URL for direct Yjs connection (production) */
  collabWorkerUrl: string
  /** BETTER_AUTH_SECRET shared with collab worker for HMAC token signing */
  betterAuthSecret: string
  /** Shared secret for authenticating dispatch requests */
  dispatchSecret: string
}

export function loadConfig(): WorkerConfig {
  const isDev = process.env.NODE_ENV === 'development' || process.env.THINKGRAPH_ENV === 'dev'

  // Support dev/prod URLs: THINKGRAPH_URL_DEV / THINKGRAPH_URL_PROD or just THINKGRAPH_URL
  const thinkgraphUrl = isDev
    ? (process.env.THINKGRAPH_URL_DEV || process.env.THINKGRAPH_URL)
    : (process.env.THINKGRAPH_URL_PROD || process.env.THINKGRAPH_URL)
  if (!thinkgraphUrl) throw new Error('THINKGRAPH_URL is required')

  // Support dev/prod team IDs: THINKGRAPH_TEAM_DEV / THINKGRAPH_TEAM_PROD or THINKGRAPH_TEAM_ID / THINKGRAPH_TEAM
  const teamId = isDev
    ? (process.env.THINKGRAPH_TEAM_DEV || process.env.THINKGRAPH_TEAM_ID || process.env.THINKGRAPH_TEAM)
    : (process.env.THINKGRAPH_TEAM_PROD || process.env.THINKGRAPH_TEAM_ID || process.env.THINKGRAPH_TEAM)
  if (!teamId) throw new Error('THINKGRAPH_TEAM is required')

  const serviceToken = process.env.THINKGRAPH_SERVICE_TOKEN || ''

  console.log(`Environment: ${isDev ? 'DEV' : 'PROD'}`)

  return {
    thinkgraphUrl: thinkgraphUrl.replace(/\/$/, ''),
    teamId,
    serviceToken,
    workDir: process.env.PI_WORK_DIR || process.cwd(),
    maxSessions: parseInt(process.env.PI_MAX_SESSIONS || '3', 10),
    sessionDir: process.env.PI_SESSION_DIR || './sessions',
    model: process.env.PI_MODEL || 'claude-sonnet-4-20250514',
    collabWorkerUrl: process.env.COLLAB_WORKER_URL || '',
    betterAuthSecret: process.env.BETTER_AUTH_SECRET || '',
    dispatchSecret: process.env.DISPATCH_SECRET || '',
  }
}
