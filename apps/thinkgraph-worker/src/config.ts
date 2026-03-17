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
}

export function loadConfig(): WorkerConfig {
  const thinkgraphUrl = process.env.THINKGRAPH_URL
  if (!thinkgraphUrl) throw new Error('THINKGRAPH_URL is required')

  const teamId = process.env.THINKGRAPH_TEAM
  if (!teamId) throw new Error('THINKGRAPH_TEAM is required')

  const serviceToken = process.env.THINKGRAPH_SERVICE_TOKEN || ''

  return {
    thinkgraphUrl: thinkgraphUrl.replace(/\/$/, ''),
    teamId,
    serviceToken,
    workDir: process.env.PI_WORK_DIR || process.cwd(),
    maxSessions: parseInt(process.env.PI_MAX_SESSIONS || '3', 10),
    sessionDir: process.env.PI_SESSION_DIR || './sessions',
    model: process.env.PI_MODEL || 'claude-sonnet-4-20250514',
  }
}
