/**
 * PATCH /api/users/me/profile
 *
 * Update the authenticated user's profile (locale, etc.).
 * Upserts the user_profile row on first write.
 */
import { z } from 'zod'
import { requireAuth } from '../../../utils/auth'
import { upsertUserProfile } from '../../../utils/user-profile'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)

  // Build supported locales list for validation
  const config = useRuntimeConfig(event)
  const supportedLocales: string[] =
    (config as Record<string, any>).croutonI18n?.supportedLocales ?? []

  const profileSchema = z.object({
    locale: z
      .string()
      .refine(
        (val) => supportedLocales.length === 0 || supportedLocales.includes(val),
        { message: `Unsupported locale. Valid: ${supportedLocales.join(', ')}` },
      )
      .nullable()
      .optional(),
  })

  const result = profileSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      status: 400,
      statusText: 'Invalid profile data',
      message: result.error.issues.map(i => i.message).join(', '),
    })
  }

  const profile = await upsertUserProfile(user.id, result.data)

  return profile
})
