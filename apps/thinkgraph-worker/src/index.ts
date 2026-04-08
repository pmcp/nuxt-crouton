/**
 * ThinkGraph Pi Worker — entry point.
 *
 * Standalone Node.js service that:
 * 1. Connects to ThinkGraph's Yjs flow room as a collaborator (presence + real-time ops)
 * 2. Polls for dispatch triggers (optional, disabled by default)
 * 3. Runs Pi agent sessions for dispatched nodes
 * 4. All real-time output flows through Yjs (no separate terminal WebSocket)
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
import { YjsFlowPool, YjsPagePool } from './yjs-pool.js'

const WORKER_VERSION = 'yjs-1'

/** Authenticate with ThinkGraph server, retrying with exponential backoff on failure */
async function authenticateWithRetry(config: { thinkgraphUrl: string; serviceToken: string }): Promise<string> {
  const email = process.env.THINKGRAPH_EMAIL
  const password = process.env.THINKGRAPH_PASSWORD
  if (!email || !password) {
    console.error('THINKGRAPH_SERVICE_TOKEN or THINKGRAPH_EMAIL + THINKGRAPH_PASSWORD required')
    process.exit(1)
  }

  const { ofetch } = await import('ofetch')
  const MAX_RETRIES = 50
  const MAX_BACKOFF_MS = 120_000

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[auth] Attempt ${attempt}/${MAX_RETRIES} — connecting to ${config.thinkgraphUrl}`)

      let sessionCookie = ''
      await ofetch(`${config.thinkgraphUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Origin': config.thinkgraphUrl },
        body: { email, password },
        timeout: 10_000,
        onResponse({ response }) {
          const cookies = (response.headers as any).getSetCookie?.() || []
          for (const cookie of cookies) {
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

      console.log(`[auth] Authenticated successfully (attempt ${attempt})`)
      console.log(`[auth] Cookie: ${sessionCookie.split('=')[0]}=...`)
      return sessionCookie
    }
    catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const isNetworkError = message.includes('fetch failed') || message.includes('ECONNREFUSED') || message.includes('no response') || message.includes('timeout')

      if (!isNetworkError) {
        console.error(`[auth] Authentication failed (not retryable): ${message}`)
        process.exit(1)
      }

      const backoff = Math.min(MAX_BACKOFF_MS, 5_000 * Math.pow(1.5, attempt - 1))
      console.warn(`[auth] Server unreachable: ${message}`)
      console.warn(`[auth] Retrying in ${Math.round(backoff / 1000)}s (attempt ${attempt}/${MAX_RETRIES})`)
      await new Promise(resolve => setTimeout(resolve, backoff))
    }
  }

  console.error(`[auth] Failed to connect after ${MAX_RETRIES} attempts. Exiting.`)
  process.exit(1)
}

async function main() {
  console.log(`=== ThinkGraph Pi Worker (${WORKER_VERSION}) ===`)
  console.log()

  const config = loadConfig()
  console.log(`Server:       ${config.thinkgraphUrl}`)
  console.log(`Team:         ${config.teamId}`)
  console.log(`Work dir:     ${config.workDir}`)
  console.log(`Max sessions: ${config.maxSessions}`)
  console.log(`Collab:       ${config.collabWorkerUrl || 'same-origin (dev)'}`)
  console.log(`Dispatch auth: ${config.dispatchSecret ? 'enabled' : 'DISABLED (set DISPATCH_SECRET to secure)'}`)
  console.log(`Yjs pool:     on-demand (connects per canvas on dispatch)`)
  console.log()

  // Authenticate and get service token
  if (!config.serviceToken) {
    config.serviceToken = await authenticateWithRetry(config)
  }

  // Initialize session manager
  const sessionManager = new AgentSessionManager(config)

  // Yjs flow pool — manages per-canvas connections on demand
  // No connection at startup — connections are established when dispatches arrive
  const yjsPool = new YjsFlowPool(config, {
    onUserPrompt: (nodeId, prompt) => {
      sessionManager.handlePrompt(nodeId, prompt)
    },
    onUserAbort: (nodeId) => {
      sessionManager.handleAbort(nodeId)
    },
    onUserSteer: (nodeId, message) => {
      sessionManager.handleSteer(nodeId, message)
    },
  })
  sessionManager.setYjsPool(yjsPool)
  console.log('[yjs-pool] Ready — canvas rooms connect on demand')

  // Yjs page pool — manages per-node block-editor rooms for pi.appendBlock.
  // Connections are opened lazily by `append_block` / `append_action_button`
  // tool calls and idle out after 30s of no use.
  const pagePool = new YjsPagePool(config)
  sessionManager.setPagePool(pagePool)
  console.log('[yjs-page-pool] Ready — page rooms connect on demand')

  // Optional: dispatch watcher (legacy polling)
  const dispatchWatcher = new DispatchWatcher(config, sessionManager)
  if (process.env.ENABLE_POLL_WATCHER === 'true') {
    dispatchWatcher.start()
  } else {
    console.log('[dispatch-watcher] Disabled — using HTTP dispatch. Set ENABLE_POLL_WATCHER=true to enable.')
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
        yjsCanvases: yjsPool.getStatus(),
        yjsPageRooms: pagePool.getStatus(),
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
      // Auth check — require DISPATCH_SECRET as Bearer token
      if (config.dispatchSecret) {
        const authHeader = req.headers.authorization || ''
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
        if (token !== config.dispatchSecret) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Unauthorized' }))
          return
        }
      }

      try {
        const body = await new Promise<string>((resolve, reject) => {
          let data = ''
          req.on('data', (chunk: Buffer) => { data += chunk.toString() })
          req.on('end', () => resolve(data))
          req.on('error', reject)
        })
        const payload = JSON.parse(body)

        if (!payload.workItemId || !payload.prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing workItemId or prompt' }))
          return
        }

        if (sessionManager.activeCount >= sessionManager.maxSessions) {
          res.writeHead(503, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Max sessions reached', active: sessionManager.activeCount }))
          return
        }

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

        console.log(`[http-dispatch] Starting session for work item ${payload.workItemId} (skill: ${payload.skill || 'none'})`)
        sessionManager.startSession(dispatchPayload).catch(err => {
          console.error(`[http-dispatch] Session failed for ${payload.workItemId}:`, err.message)
        })

        res.writeHead(202, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          accepted: true,
          version: WORKER_VERSION,
          workItemId: payload.workItemId,
          skill: payload.skill,
          yjsCanvases: yjsPool.size,
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
    yjsPool.disconnectAll()
    pagePool.disconnectAll()
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
