// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updatePagesPage, findUniqueSlugPagesPages } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { PagesPage } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { pageId } = getRouterParams(event)
  if (!pageId) {
    throw createError({ status: 400, statusText: 'Missing page ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<PagesPage>>(event)

  // Deduplicate slug if it's being changed
  let slug = body.slug
  if (slug) {
    slug = await findUniqueSlugPagesPages(team.id, slug, pageId)
  }

  return await updatePagesPage(pageId, team.id, user.id, {
    title: body.title,
    slug,
    pageType: body.pageType,
    content: body.content,
    config: body.config,
    status: body.status,
    visibility: body.visibility,
    publishedAt: body.publishedAt ? new Date(body.publishedAt) : body.publishedAt,
    showInNavigation: body.showInNavigation,
    layout: body.layout,
    seoTitle: body.seoTitle,
    seoDescription: body.seoDescription,
    ogImage: body.ogImage,
    robots: body.robots
  })
})