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
import { loadConfig } from './config.js'
import { AgentSessionManager } from './session-manager.js'
import { DispatchWatcher } from './dispatch-watcher.js'
import { YjsClient } from './yjs-client.js'

async function main() {
  console.log('=== ThinkGraph Pi Worker ===')
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

      // Sign in to get session cookie
      const signInResult = await ofetch(`${config.thinkgraphUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        body: { email, password },
        // Get set-cookie header
        onResponse({ response }) {
          const setCookie = response.headers.get('set-cookie')
          if (setCookie) {
            // Extract session token from cookie
            const match = setCookie.match(/better_auth_session=([^;]+)/)
            if (match) {
              config.serviceToken = match[1]
            }
          }
        },
      })

      if (!config.serviceToken) {
        // Try getting a worker token
        const tokenResult = await ofetch(`${config.thinkgraphUrl}/api/teams/${config.teamId}/worker-auth`, {
          method: 'POST',
          headers: {
            'Cookie': `better_auth_session=${config.serviceToken}`,
          },
        })
        config.serviceToken = tokenResult.token
      }

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

  // Start watching for dispatches
  dispatchWatcher.start()

  // Optional: connect Yjs for presence
  // Disabled by default until DO protocol compatibility is verified
  if (process.env.ENABLE_YJS === 'true') {
    yjsClient.connect()
  }

  // Health check info
  console.log()
  console.log('Worker running. Watching for dispatch triggers...')
  console.log('Press Ctrl+C to stop.')

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...')
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
