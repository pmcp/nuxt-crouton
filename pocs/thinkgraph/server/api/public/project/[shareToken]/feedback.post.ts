import { eq } from 'drizzle-orm'
import { thinkgraphProjects } from '~~/layers/thinkgraph/collections/projects/server/database/schema'
import { getAllThinkgraphNodes } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'
import { createThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'

/**
 * Public feedback endpoint — no auth required.
 * Creates a 'review' work item with client feedback.
 *
 * POST /api/public/project/[shareToken]/feedback
 * Body: { feedback: string, author?: string }
 */
export default defineEventHandler(async (event) => {
  const { shareToken } = getRouterParams(event)
  if (!shareToken) {
    throw createError({ status: 400, statusText: 'Missing share token' })
  }

  const body = await readBody(event)
  const feedback = body?.feedback?.trim()
  if (!feedback) {
    throw createError({ status: 400, statusText: 'Feedback text is required' })
  }

  const author = body?.author?.trim() || 'Client'

  const db = useDB()

  const [project] = await (db as any)
    .select()
    .from(thinkgraphProjects)
    .where(eq(thinkgraphProjects.shareToken, shareToken))
    .limit(1)

  if (!project) {
    throw createError({ status: 404, statusText: 'Project not found' })
  }

  // Find the last completed work item to use as parent
  const allItems = await getAllThinkgraphNodes(project.teamId)
  const projectItems = allItems
    .filter((item: any) => item.projectId === project.id)

  // Find the latest 'done' item as parent, or null if none
  const doneItems = projectItems
    .filter((item: any) => item.status === 'done')
    .sort((a: any, b: any) => (b.order ?? 0) - (a.order ?? 0))

  const parentId = doneItems.length > 0 ? doneItems[0].id : null

  const workItem = await createThinkgraphNode({
    teamId: project.teamId,
    owner: 'system',
    projectId: project.id,
    title: `Client feedback from ${author}`,
    type: 'review',
    status: 'waiting',
    assignee: 'human',
    brief: feedback,
    parentId,
  } as any)

  return {
    success: true,
    workItemId: workItem.id,
  }
})
