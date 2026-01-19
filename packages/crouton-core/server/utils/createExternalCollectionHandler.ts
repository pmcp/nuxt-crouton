import type { H3Event, EventHandlerRequest } from 'h3'

/**
 * Transform function that converts external data to Crouton format
 * Must return at minimum: { id: string, title: string }
 * The 'title' field is used by CroutonReferenceSelect for display
 */
export type ExternalCollectionTransform<T> = (item: T) => {
  id: string
  title: string
  [key: string]: any
}

/**
 * Fetch function that retrieves data from your external system
 * Receives the H3Event for access to params, auth, etc.
 */
export type ExternalCollectionFetchFn<T> = (
  event: H3Event<EventHandlerRequest>
) => Promise<T[]> | T[]

/**
 * Helper to create API handlers for external collections
 *
 * This utility wraps your existing queries and transforms the results
 * to Crouton's expected format: `{ id, title, ...other fields }`
 *
 * Note: This function is auto-imported by Nuxt - no import statement needed.
 *
 * @example
 * ```typescript
 * // server/api/teams/[id]/users/index.get.ts
 * // No import needed - auto-imported by Nuxt
 * import { getActiveTeamMembers } from '~/server/database/queries/teams'
 * import { validateTeamOwnership } from '~/server/utils/teamValidation'
 *
 * export default createExternalCollectionHandler(
 *   async (event) => {
 *     const teamId = getRouterParam(event, 'id')
 *     await validateTeamOwnership(event, teamId!)
 *     return await getActiveTeamMembers(teamId!)
 *   },
 *   (member) => ({
 *     id: member.userId,
 *     title: member.name,        // Required for dropdown display
 *     email: member.email,
 *     avatarUrl: member.avatarUrl,
 *     role: member.role
 *   })
 * )
 * ```
 *
 * @param fetchFn - Function that retrieves items from your system
 * @param transform - Function that converts items to Crouton format
 * @returns Event handler ready for Nuxt server routes
 */
export function createExternalCollectionHandler<T>(
  fetchFn: ExternalCollectionFetchFn<T>,
  transform: ExternalCollectionTransform<T>
) {
  return defineEventHandler(async (event) => {
    try {
      const items = await fetchFn(event)
      const transformed = items.map(transform)

      // Support ?ids= query parameter for useCollectionItem compatibility
      const query = getQuery(event)
      if (query.ids) {
        const requestedIds = String(query.ids).split(',')
        return transformed.filter(item => requestedIds.includes(item.id))
      }

      return transformed
    } catch (error) {
      console.error('[createExternalCollectionHandler] Error:', error)
      throw createError({
        statusCode: error instanceof Error && 'statusCode' in error
          ? (error as any).statusCode
          : 500,
        statusMessage: error instanceof Error
          ? error.message
          : 'Failed to fetch external collection'
      })
    }
  })
}
