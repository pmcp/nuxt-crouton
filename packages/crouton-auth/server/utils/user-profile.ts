/**
 * User Profile Server Utilities
 *
 * Shared helpers for reading and upserting user profiles.
 * Uses true SQL upsert (ON CONFLICT DO UPDATE) to prevent race conditions.
 */
import { eq } from 'drizzle-orm'
import { tables, useDB } from './database'

/**
 * Get a user's profile by userId
 *
 * @returns Profile record or null if not yet created
 */
export async function getUserProfile(userId: string) {
  const db = useDB()
  const rows = await db
    .select()
    .from(tables.userProfile)
    .where(eq(tables.userProfile.userId, userId))
    .limit(1)

  return rows[0] ?? null
}

/**
 * Upsert a user's profile
 *
 * Creates the profile row on first write, updates on subsequent writes.
 * Uses ON CONFLICT(userId) DO UPDATE for race-condition safety.
 */
export async function upsertUserProfile(
  userId: string,
  data: { locale?: string | null },
) {
  const db = useDB()

  await db
    .insert(tables.userProfile)
    .values({
      userId,
      ...data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: tables.userProfile.userId,
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })

  // Return the updated profile
  return getUserProfile(userId)
}
