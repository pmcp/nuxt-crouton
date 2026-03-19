import { eq } from 'drizzle-orm'
import { thinkgraphProjects } from '~~/layers/thinkgraph/collections/projects/server/database/schema'
import { getAllThinkgraphWorkItems } from '~~/layers/thinkgraph/collections/workitems/server/database/queries'

/**
 * Public project view — no auth required.
 * Looks up project by shareToken and returns project + work items.
 *
 * GET /api/public/project/[shareToken]
 */
export default defineEventHandler(async (event) => {
  const { shareToken } = getRouterParams(event)
  if (!shareToken) {
    throw createError({ status: 400, statusText: 'Missing share token' })
  }

  const db = useDB()

  const [project] = await (db as any)
    .select()
    .from(thinkgraphProjects)
    .where(eq(thinkgraphProjects.shareToken, shareToken))
    .limit(1)

  if (!project) {
    throw createError({ status: 404, statusText: 'Project not found' })
  }

  // Fetch work items for this project (uses team-scoped query)
  const allItems = await getAllThinkgraphWorkItems(project.teamId)
  const workItems = allItems
    .filter((item: any) => item.projectId === project.id)
    .map((item: any) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status,
      brief: item.brief,
      output: item.output,
      parentId: item.parentId,
      assignee: item.assignee,
      deployUrl: item.deployUrl,
      retrospective: item.retrospective,
      order: item.order,
    }))

  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      clientName: project.clientName,
      description: project.description,
      deployUrl: project.deployUrl,
    },
    workItems,
  }
})
