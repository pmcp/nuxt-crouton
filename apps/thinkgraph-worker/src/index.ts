/**
 * ThinkGraph Pi Worker — entry point.
 *
 * Standalone Node.js service that:
 * 1. Connects to ThinkGraph's Yjs rooms for presence (optional, future)
 * 2. Polls for dispatch triggers (nodes with 'dispatching' status)
 * 3. Runs Pi agent sessions for dispatched nodes
 * 4. Streams terminal output via WebSocket to ThinkGraph
 *
 * Usage:
 *   pnpm dev     # Development with hot reload
 *   pnpm start   # Production
 */
import 'dotenv/config'
import { createServer } from 'node:http'
import { loadConfig } from './config.js'
import { AgentSessionManager } from './session-manager.js'
import { DispatchWatcher } from './dispatch-watcher.js'
import { YjsClient } from './yjs-client.js'

const WORKER_VERSION = 'pm-2'

async function main() {
  console.log(`=== ThinkGraph Pi Worker (${WORKER_VERSION}) ===`)
  console.log()

  const config = loadConfig()
  console.log(`Server:     ${config.thinkgraphUrl}`)
  console.log(`Team:       ${config.teamId}`)
  console.log(`Work dir:   ${config.workDir}`)
  console.log(`Max sessions: ${config.maxSessions}`)
  console.log()

  // Authenticate and get service token if not provided
  if (!config.serviceToken) {
    console.log('No service token provided. Authenticating...')
    const { ofetch } = await import('ofetch')
    try {
      // Sign in via Better Auth
      const email = process.env.THINKGRAPH_EMAIL
      const password = process.env.THINKGRAPH_PASSWORD
      if (!email || !password) {
        throw new Error('THINKGRAPH_SERVICE_TOKEN or THINKGRAPH_EMAIL + THINKGRAPH_PASSWORD required')
      }

      // Sign in — capture the full session cookie from set-cookie header
      // On Cloudflare, cookie name is __Secure-better-auth.session_token
      // In dev, it's better_auth_session
      // Origin header required for CSRF protection
      let sessionCookie = '' // Full "name=value" pair for the Cookie header
      await ofetch(`${config.thinkgraphUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Origin': config.thinkgraphUrl },
        body: { email, password },
        onResponse({ response }) {
          const cookies = (response.headers as any).getSetCookie?.() || []
          for (const cookie of cookies) {
            // Match either cookie name pattern (Cloudflare secure or dev)
            const match = cookie.match(/((?:__Secure-)?better[_-]auth[._]session(?:_token)?)=([^;]+)/)
            if (match) {
              sessionCookie = `${match[1]}=${match[2]}`
              break
            }
          }
        },
      })

      if (!sessionCookie) {
        throw new Error('Sign-in succeeded but no session cookie in response headers')
      }

      // Store the full cookie string (name=value) for use in Cookie headers
      config.serviceToken = sessionCookie
      console.log('Session cookie captured:', sessionCookie.split('=')[0] + '=...')

      console.log('Authentication successful')
    }
    catch (err) {
      console.error('Authentication failed:', err instanceof Error ? err.message : err)
      process.exit(1)
    }
  }

  // Initialize components
  const sessionManager = new AgentSessionManager(config)
  const dispatchWatcher = new DispatchWatcher(config, sessionManager)

  // Optional: Yjs client for presence and real-time signals
  const yjsClient = new YjsClient(config, (collection, version) => {
    if (collection === 'thinkgraphDecisions') {
      console.log(`[yjs] thinkgraphDecisions version ${version} — triggering poll`)
      // The dispatch watcher will pick up changes on next poll
      // Future: trigger immediate poll here
    }
  })

  // Start watching for dispatches (legacy polling — disabled for PM flow, HTTP dispatch is primary)
  if (process.env.ENABLE_POLL_WATCHER === 'true') {
    dispatchWatcher.start()
  } else {
    console.log('[dispatch-watcher] Disabled — using HTTP dispatch. Set ENABLE_POLL_WATCHER=true to enable.')
  }

  // Optional: connect Yjs for presence
  // Disabled by default until DO protocol compatibility is verified
  if (process.env.ENABLE_YJS === 'true') {
    yjsClient.connect()
  }

  // HTTP server — health + dispatch endpoints
  const startedAt = Date.now()
  const healthPort = parseInt(process.env.HEALTH_PORT || '8787', 10)
  const httpServer = createServer(async (req, res) => {
    // CORS for Cloudflare Pages
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (req.url === '/health' && req.method === 'GET') {
      const mem = process.memoryUsage()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        status: 'ok',
        version: WORKER_VERSION,
        uptime: Math.floor((Date.now() - startedAt) / 1000),
        activeSessions: sessionManager.activeCount,
        maxSessions: sessionManager.maxSessions,
        yjsConnected: process.env.ENABLE_YJS === 'true' ? yjsClient.isConnected : false,
        memory: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        },
      }))
      return
    }

    // POST /dispatch — accept work item dispatch from ThinkGraph
    if (req.url === '/dispatch' && req.method === 'POST') {
      try {
        const body = await new Promise<string>((resolve, reject) => {
          let data = ''
          req.on('data', (chunk: Buffer) => { data += chunk.toString() })
          req.on('end', () => resolve(data))
          req.on('error', reject)
        })
        const payload = JSON.parse(body)

        // Validate required fields
        if (!payload.workItemId || !payload.prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing workItemId or prompt' }))
          return
        }

        // Check capacity
        if (sessionManager.activeCount >= sessionManager.maxSessions) {
          res.writeHead(503, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Max sessions reached', active: sessionManager.activeCount }))
          return
        }

        // Map work item dispatch to the existing DispatchPayload format
        const dispatchPayload = {
          nodeId: payload.workItemId,
          graphId: payload.projectId || '',
          depth: 'thorough',
          depthInstruction: 'Complete the task described in the brief.',
          prompt: payload.prompt,
          context: payload.context || '',
          teamSlug: payload.teamSlug || '',
          nodeContent: payload.prompt,
          nodeType: payload.workItemType || 'generate',
          mode: 'rich' as const,
          callbackUrl: payload.callbackUrl || undefined,
          skill: payload.skill || undefined,
          collectionPath: 'thinkgraph-nodes',
          teamId: payload.teamId || undefined,
          stage: payload.stage || undefined,
        }

        // Start session (async — don't await completion)
        console.log(`[http-dispatch] Starting session for work item ${payload.workItemId} (skill: ${payload.skill || 'none'})`)
        sessionManager.startSession(dispatchPayload).catch(err => {
          console.error(`[http-dispatch] Session failed for ${payload.workItemId}:`, err.message)
        })

        // Respond immediately — session runs in background
        res.writeHead(202, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          accepted: true,
          version: WORKER_VERSION,
          workItemId: payload.workItemId,
          skill: payload.skill,
        }))
      } catch (err: any) {
        console.error('[http-dispatch] Error:', err.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
      return
    }

    res.writeHead(404)
    res.end()
  })
  httpServer.listen(healthPort, () => {
    console.log(`HTTP server: http://localhost:${healthPort} (health + dispatch)`)
  })

  console.log()
  console.log('Worker running. Watching for dispatch triggers...')
  console.log('Press Ctrl+C to stop.')

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...')
    httpServer.close()
    dispatchWatcher.stop()
    yjsClient.disconnect()
    await sessionManager.abortAll()
    console.log('Goodbye.')
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
