/**
 * GET /api/users/me/profile
 *
 * Get the authenticated user's profile.
 * Returns null fields if no profile row exists yet (lazy-create).
 */
import { requireAuth } from '../../../utils/auth'
import { getUserProfile } from '../../../utils/user-profile'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const profile = await getUserProfile(user.id)

  // Return a consistent shape even when no profile row exists yet
  return profile ?? { userId: user.id, locale: null }
})
