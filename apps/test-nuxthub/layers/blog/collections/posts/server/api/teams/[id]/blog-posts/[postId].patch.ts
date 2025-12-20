// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBlogPost } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { BlogPost } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { postId } = getRouterParams(event)
  if (!postId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing post ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<BlogPost>>(event)

  return await updateBlogPost(postId, team.id, user.id, {
    id: body.id,
    title: body.title,
    slug: body.slug,
    content: body.content,
    excerpt: body.excerpt,
    published: body.published,
    publishedAt: body.publishedAt,
    sortOrder: body.sortOrder
  })
})