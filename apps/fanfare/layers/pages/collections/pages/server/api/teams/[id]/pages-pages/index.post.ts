// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { createPagesPage, getPagesPagesByIds } from '../../../../database/queries'
import { nanoid } from 'nanoid'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { z } from 'zod'

const bodySchema = z.object({
  pageType: z.string().min(1, 'pageType is required'),
  config: z.record(z.string(), z.any()).nullable().optional(),
  status: z.string().min(1, 'status is required'),
  visibility: z.string().min(1, 'visibility is required'),
  publishedAt: z.coerce.date().optional(),
  showInNavigation: z.boolean().optional(),
  layout: z.string().optional(),
  ogImage: z.string().optional(),
  robots: z.string().optional(),
  title: z.string().optional(),
  slug: z.string().optional(),
  content: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  parentId: z.string().nullable().optional(),
  translations: z.record(
    z.string(),
    z.object({
      title: z.string().min(1, 'Title is required'),
      slug: z.string().min(1, 'Slug is required'),
      content: z.string().optional(),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional()
    })
  ).refine(
    (translations) => translations.en && translations.en.title && translations.en.slug,
    { message: 'English translations for title, slug are required' }
  )
}).strip()

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const authTimer = timing.start('auth')
  const { team, user } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readValidatedBody(event, bodySchema.parse)

  // body.id is already stripped by the schema's .strip(); generate our own
  // id upfront so path can reference it.
  const recordId = nanoid()

  // Calculate path based on parentId
  let path = `/${recordId}/`
  let depth = 0

  if (body.parentId) {
    const [parent] = await getPagesPagesByIds(team.id, [body.parentId])
    if (parent) {
      path = `${parent.path}${recordId}/`
      depth = (parent.depth || 0) + 1
    }
  }

  // Convert date string to Date object
  if (body.publishedAt) {
    body.publishedAt = new Date(body.publishedAt)
  }
  const dbTimer = timing.start('db')
  // Cast because the generated NewPagesPage type still treats translatable
  // root fields (title/slug) as required and omits the hierarchy `order`
  // field; the DB schema and runtime accept the shape we're passing.
  const result = await createPagesPage({
    ...body,
    id: recordId,
    path,
    depth,
    teamId: team.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id
  } as Parameters<typeof createPagesPage>[0])
  dbTimer.end()
  return result
})