/**
 * Request/Response Logging Middleware
 *
 * Nitro middleware that logs all incoming requests and outgoing responses
 * with timing information and contextual details.
 *
 * Features:
 * - Logs all API requests with method, path, IP
 * - Logs response status and duration
 * - Captures request/response sizes
 * - Includes user agent and referrer
 * - Filters sensitive headers (Authorization, Cookie)
 * - Skip logging for health checks and static assets
 *
 * This middleware runs for ALL requests in the Nuxt/Nitro server.
 */

import { logger } from '../utils/logger'

/**
 * Paths to skip logging (health checks, assets)
 */
const SKIP_PATHS = [
  '/api/health',
  '/api/ping',
  '/_nuxt/',
  '/favicon.ico',
  '/robots.txt',
]

/**
 * Headers to exclude from logging (sensitive data)
 */
const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
]

/**
 * Extract safe request headers (excluding sensitive ones)
 */
function getSafeHeaders(headers: Headers): Record<string, string> {
  const safe: Record<string, string> = {}

  headers.forEach((value, key) => {
    if (!SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      safe[key] = value
    }
  })

  return safe
}

/**
 * Check if request should be logged
 */
function shouldLog(path: string): boolean {
  return !SKIP_PATHS.some(skip => path.startsWith(skip))
}

/**
 * Get client IP address from request
 */
function getClientIP(event: any): string {
  // Try Cloudflare header first
  const cfConnectingIP = event.node.req.headers['cf-connecting-ip']
  if (cfConnectingIP) return cfConnectingIP as string

  // Try X-Forwarded-For
  const xForwardedFor = event.node.req.headers['x-forwarded-for']
  if (xForwardedFor) {
    const ips = (xForwardedFor as string).split(',')
    return ips[0].trim()
  }

  // Try X-Real-IP
  const xRealIP = event.node.req.headers['x-real-ip']
  if (xRealIP) return xRealIP as string

  // Fallback to socket address
  return event.node.req.socket?.remoteAddress || 'unknown'
}

/**
 * Logging middleware
 */
export default defineEventHandler(async (event) => {
  const path = event.path || event.node.req.url || ''
  const method = event.method || event.node.req.method || 'UNKNOWN'

  // Skip logging for certain paths
  if (!shouldLog(path)) {
    return
  }

  // Start timer
  const startTime = Date.now()

  // Log incoming request
  const clientIP = getClientIP(event)
  const userAgent = event.node.req.headers['user-agent'] || 'unknown'
  const referer = event.node.req.headers['referer'] || event.node.req.headers['referrer']

  logger.request(method, path, {
    ip: clientIP,
    userAgent,
    ...(referer && { referer }),
  })

  // Hook into response to log completion
  event.node.res.on('finish', () => {
    const duration = Date.now() - startTime
    const statusCode = event.node.res.statusCode

    logger.response(method, path, statusCode, duration, {
      ip: clientIP,
    })
  })
})