// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updatePlaygroundPost, getPlaygroundPostsByIds } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team-auth'
import type { PlaygroundPost } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { postId } = getRouterParams(event)
  if (!postId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing post ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<PlaygroundPost>>(event)

  // Handle translation updates properly
  if (body.translations && body.locale) {
    const [existing] = await getPlaygroundPostsByIds(team.id, [postId]) as any[]
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

  return await updatePlaygroundPost(postId, team.id, user.id, {
    id: body.id,
    title: body.title,
    slug: body.slug,
    excerpt: body.excerpt,
    content: body.content,
    status: body.status,
    publishedAt: body.publishedAt ? new Date(body.publishedAt) : body.publishedAt,
    featuredImage: body.featuredImage,
    categoryId: body.categoryId,
    metadata: body.metadata,
    translations: body.translations
  })
})