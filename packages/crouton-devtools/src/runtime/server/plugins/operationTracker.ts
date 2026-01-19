/**
 * Nitro Plugin - Operation Tracker
 *
 * Tracks all CRUD operations to Crouton collection endpoints.
 * Runs as a Nitro plugin using the onAfterResponse hook.
 */

import { defineNitroPlugin } from 'nitropack/runtime'
import type { NitroApp } from 'nitropack'
import { operationStore, type Operation } from '../utils/operationStore'

/**
 * Extract collection name from API path
 */
function extractCollectionName(path: string): string {
  const match = path.match(/\/api\/crouton-collection\/([^/?]+)/)
  return match?.[1] || 'unknown'
}

/**
 * Extract item ID from API path for get/update/delete operations
 * Path format: /api/crouton-collection/{collection}/{itemId}
 */
function extractItemId(path: string): string | undefined {
  // Match patterns like /api/crouton-collection/users/abc123
  // where abc123 is the item ID (not a query param or search suffix)
  const match = path.match(/\/api\/crouton-collection\/[^/]+\/([a-zA-Z0-9_-]+)(?:\?|$)/)
  const itemId = match?.[1]

  // Exclude known non-ID paths
  if (itemId === 'search' || itemId === 'export') {
    return undefined
  }

  return itemId
}

/**
 * Detect operation type from HTTP method and path
 */
function detectOperation(method: string, path: string): Operation['operation'] {
  const normalizedMethod = method.toUpperCase()

  if (normalizedMethod === 'GET' && path.includes('/search')) {
    return 'list'
  }

  if (normalizedMethod === 'GET' && /\/[a-z0-9-]+$/i.test(path)) {
    return 'get'
  }

  if (normalizedMethod === 'GET') {
    return 'list'
  }

  if (normalizedMethod === 'POST') {
    return 'create'
  }

  if (normalizedMethod === 'PATCH' || normalizedMethod === 'PUT') {
    return 'update'
  }

  if (normalizedMethod === 'DELETE') {
    return 'delete'
  }

  return 'list'
}

/**
 * Generate unique ID for operation
 */
function generateId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export default defineNitroPlugin((nitroApp: NitroApp) => {
  // Only track in development
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  // Track request timing
  const requestTimings = new Map<string, { startTime: number, id: string, path: string, method: string, collection: string, operation: Operation['operation'], itemId?: string }>()

  // Hook: Before request
  nitroApp.hooks.hook('request', (event) => {
    const path = event.path || event.node.req.url || ''
    const method = event.method || event.node.req.method || 'GET'

    // Only track Crouton collection API routes
    if (!path.startsWith('/api/crouton-collection/')) {
      return
    }

    const id = generateId()
    const collection = extractCollectionName(path)
    const operation = detectOperation(method, path)
    const itemId = extractItemId(path)

    requestTimings.set(event.node.req as any, {
      startTime: Date.now(),
      id,
      path,
      method,
      collection,
      operation,
      itemId
    })
  })

  // Hook: After response
  nitroApp.hooks.hook('afterResponse', (event) => {
    const timing = requestTimings.get(event.node.req as any)

    if (!timing) {
      return
    }

    const duration = Date.now() - timing.startTime
    const status = event.node.res.statusCode || 200
    const teamContext = (event.context as any).team?.id

    operationStore.add({
      id: timing.id,
      timestamp: timing.startTime,
      collection: timing.collection,
      operation: timing.operation,
      method: timing.method,
      path: timing.path,
      status,
      duration,
      teamContext,
      error: status >= 400 ? `HTTP ${status}` : undefined,
      itemId: timing.itemId
    })

    // Clean up
    requestTimings.delete(event.node.req as any)
  })
})
