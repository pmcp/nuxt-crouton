/**
 * Operation Tracker Middleware
 *
 * Tracks all CRUD operations to Crouton collection endpoints.
 * Only active in development mode.
 */

import { defineEventHandler } from 'h3'
import { operationStore, type Operation } from '../utils/operationStore'

/**
 * Extract collection name from API path
 * Example: /api/crouton-collection/users/123 → users
 */
function extractCollectionName(path: string): string {
  const match = path.match(/\/api\/crouton-collection\/([^/?]+)/)
  return match?.[1] || 'unknown'
}

/**
 * Detect operation type from HTTP method and path
 */
function detectOperation(method: string, path: string): Operation['operation'] {
  const normalizedMethod = method.toUpperCase()

  // List operation - GET with /search endpoint
  if (normalizedMethod === 'GET' && path.includes('/search')) {
    return 'list'
  }

  // Get single item - GET with ID
  if (normalizedMethod === 'GET' && /\/[a-zA-Z0-9-]+$/.test(path)) {
    return 'get'
  }

  // Get collection (list without search) - GET to base endpoint
  if (normalizedMethod === 'GET') {
    return 'list'
  }

  // Create - POST
  if (normalizedMethod === 'POST') {
    return 'create'
  }

  // Update - PATCH or PUT
  if (normalizedMethod === 'PATCH' || normalizedMethod === 'PUT') {
    return 'update'
  }

  // Delete - DELETE
  if (normalizedMethod === 'DELETE') {
    return 'delete'
  }

  // Default to list
  return 'list'
}

/**
 * Generate unique ID for operation
 */
function generateId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Operation tracker middleware
 * Wraps around API requests to track timing and status
 */
export default defineEventHandler(async (event) => {
  // Only track in development
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  const path = event.path || event.node.req.url || ''
  const method = event.method || event.node.req.method || 'GET'

  // Only track Crouton collection API routes
  if (!path.startsWith('/api/crouton-collection/')) {
    return
  }

  const startTime = Date.now()
  const id = generateId()
  const collection = extractCollectionName(path)
  const operation = detectOperation(method, path)

  // Extract team context if available
  const teamContext = event.context.team?.id

  try {
    // This middleware doesn't intercept the response
    // It runs alongside the actual handler
    // We'll track the operation after the response

    // Note: We can't easily intercept the response here without
    // modifying the request flow. Instead, we'll use onAfterResponse hook
    // or track optimistically

    // For now, we'll set up a response interceptor
    const originalSetResponseStatus = event.node.res.statusCode

    // Track the operation after response
    event.node.res.on('finish', () => {
      const status = event.node.res.statusCode || 200
      const duration = Date.now() - startTime

      operationStore.add({
        id,
        timestamp: startTime,
        collection,
        operation,
        method,
        path,
        status,
        duration,
        teamContext,
        error: status >= 400 ? `HTTP ${status}` : undefined,
      })
    })

    // Let the request continue
    return
  } catch (error: any) {
    // Track failed operation
    const duration = Date.now() - startTime

    operationStore.add({
      id,
      timestamp: startTime,
      collection,
      operation,
      method,
      path,
      status: error.statusCode || 500,
      duration,
      teamContext,
      error: error.message || 'Unknown error',
    })

    // Re-throw to let error handling continue
    throw error
  }
})
