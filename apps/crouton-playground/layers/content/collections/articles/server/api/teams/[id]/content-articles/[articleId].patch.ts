// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateContentArticle } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ContentArticle } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { articleId } = getRouterParams(event)
  if (!articleId) {
    throw createError({ status: 400, statusText: 'Missing article ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<ContentArticle>>(event)

  return await updateContentArticle(articleId, team.id, user.id, {
    title: body.title,
    slug: body.slug,
    summary: body.summary,
    publishedAt: body.publishedAt ? new Date(body.publishedAt) : body.publishedAt,
    featured: body.featured,
    hero: body.hero,
    categoryId: body.categoryId,
    attachment: body.attachment
  })
})