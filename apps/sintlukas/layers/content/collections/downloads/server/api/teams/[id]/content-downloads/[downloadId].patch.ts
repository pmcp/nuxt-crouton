// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateContentDownload, getContentDownloadsByIds } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ContentDownload } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { downloadId } = getRouterParams(event)
  if (!downloadId) {
    throw createError({ status: 400, statusText: 'Missing download ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody<Partial<ContentDownload>>(event)

  // Handle translation updates properly
  if (body.translations && body.locale) {
    const [existing] = await getContentDownloadsByIds(team.id, [downloadId]) as any[]
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
  const result = await updateContentDownload(downloadId, team.id, user.id, {
    title: body.title,
    internalName: body.internalName,
    file: body.file,
    order: body.order,
    translations: body.translations
  }, { role: membership.role })
  dbTimer.end()
  return result
})