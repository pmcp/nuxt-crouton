import { z } from 'zod'

export default defineMcpTool({
  description: 'List items from a Crouton collection. Returns paginated results. Use list-collections first to discover available collection names.',
  inputSchema: {
    collection: z.string().describe('Collection name (e.g., "bookingsLocations", "pagesPages")'),
    teamId: z.string().describe('Team/organization ID'),
    locale: z.string().optional().describe('Locale for translated content (e.g., "en", "de")'),
    page: z.number().optional().default(1).describe('Page number'),
    pageSize: z.number().optional().default(20).describe('Items per page')
  },
  async handler({ collection, teamId, locale, page, pageSize }) {
    const col = getMcpCollectionByName(collection)
    if (!col) {
      return errorResult(`Collection "${collection}" not found. Use list-collections to see available collections.`)
    }

    try {
      const event = useEvent()
      await requireMcpAuth(event, teamId)

      const apiPath = getCollectionApiPath(col, teamId)
      const query: Record<string, string | number> = { page, pageSize }
      if (locale) query.locale = locale

      const data = await $fetch(apiPath, { query })
      return jsonResult(data)
    }
    catch (error: any) {
      return errorResult(`Error listing items: ${error.message || error}`)
    }
  }
})
