import { getHeader } from 'h3'
import type { H3Event } from 'h3'

interface MutationTrackOptions {
  event: H3Event
  teamId: string
  operation: 'create' | 'update' | 'delete'
  collection: string
  itemId: string
  data?: Record<string, any>
}

const INTERNAL_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'teamId', 'owner'])

function buildChanges(operation: 'create' | 'update' | 'delete', data?: Record<string, any>) {
  if (!data || operation === 'delete') return []
  return Object.entries(data)
    .filter(([key]) => !INTERNAL_FIELDS.has(key))
    .map(([key, value]) => ({
      fieldName: key,
      oldValue: null as string | null,
      newValue: JSON.stringify(value)
    }))
}

/**
 * Track an MCP tool mutation in the crouton-events audit log.
 *
 * MCP tools run server-side only — the client-side event-listener plugin
 * never fires for them. This utility posts directly to the events write
 * endpoint, forwarding the session cookie so auth passes.
 *
 * Callers should fire-and-forget: trackMcpMutation(...).catch(() => {})
 */
export async function trackMcpMutation(options: MutationTrackOptions): Promise<void> {
  const { event, teamId, operation, collection, itemId, data } = options
  const cookieHeader = getHeader(event, 'cookie') || ''

  await $fetch(`/api/teams/${teamId}/crouton-collection-events`, {
    method: 'POST',
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    body: {
      operation,
      collectionName: collection,
      itemId,
      changes: buildChanges(operation, data),
      metadata: { mutationSource: 'mcp' }
    }
  })
}
