// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateContentArticle } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ContentArticle } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { articleId } = getRouterParams(event)
  if (!articleId) {
    throw createError({ status: 400, statusText: 'Missing article ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody<Partial<ContentArticle>>(event)

  const dbTimer = timing.start('db')
  const result = await updateContentArticle(articleId, team.id, user.id, {
    title: body.title,
    slug: body.slug,
    date: body.date ? new Date(body.date) : body.date,
    category: body.category,
    content: body.content,
    imageUrl: body.imageUrl,
    tags: body.tags,
    featured: body.featured,
    status: body.status,
    publishedAt: body.publishedAt ? new Date(body.publishedAt) : body.publishedAt
  }, { role: membership.role })
  dbTimer.end()
  return result
})