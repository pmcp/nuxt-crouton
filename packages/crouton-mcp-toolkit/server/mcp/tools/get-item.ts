import { z } from 'zod'

export default defineMcpTool({
  description: 'Get a single item from a Crouton collection by ID.',
  inputSchema: {
    collection: z.string().describe('Collection name (e.g., "bookingsLocations")'),
    teamId: z.string().describe('Team/organization ID'),
    itemId: z.string().describe('The item ID to retrieve')
  },
  async handler({ collection, teamId, itemId }) {
    const col = getMcpCollectionByName(collection)
    if (!col) {
      return errorResult(`Collection "${collection}" not found. Use list-collections to see available collections.`)
    }

    try {
      const event = useEvent()
      await requireMcpAuth(event, teamId)

      const apiPath = getCollectionApiPath(col, teamId)
      const data = await $fetch(apiPath, {
        query: { ids: itemId }
      })

      return jsonResult(data)
    }
    catch (error: any) {
      return errorResult(`Error getting item: ${error.message || error}`)
    }
  }
})
