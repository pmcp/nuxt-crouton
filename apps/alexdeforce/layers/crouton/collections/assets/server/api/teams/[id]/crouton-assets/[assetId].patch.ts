// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateCroutonAsset, getCroutonAssetsByIds } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { CroutonAsset } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { assetId } = getRouterParams(event)
  if (!assetId) {
    throw createError({ status: 400, statusText: 'Missing asset ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody<Partial<CroutonAsset>>(event)

  // Handle translation updates properly
  if (body.translations && body.locale) {
    const [existing] = await getCroutonAssetsByIds(team.id, [assetId]) as any[]
    if (existing) {
      body.translations = {
        ...existing.translations,
        [body.locale]: {
          ...existing.translations?.[body.locale],
          ...body.translations[body.locale]
        }
      }
    }
  }

  const dbTimer = timing.start('db')
  const result = await updateCroutonAsset(assetId, team.id, user.id, {
    userId: body.userId,
    filename: body.filename,
    pathname: body.pathname,
    contentType: body.contentType,
    size: body.size,
    category: body.category,
    width: body.width,
    height: body.height,
    alt: body.alt,
    uploadedAt: body.uploadedAt ? new Date(body.uploadedAt) : body.uploadedAt,
    updatedBy: body.updatedBy,
    translations: body.translations
  }, { role: membership.role })
  dbTimer.end()
  return result
})