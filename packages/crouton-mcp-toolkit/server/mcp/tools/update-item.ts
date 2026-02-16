import { z } from 'zod'

export default defineMcpTool({
  description: 'Update an existing item in a Crouton collection. Only include the fields you want to change.',
  inputSchema: {
    collection: z.string().describe('Collection name (e.g., "bookingsLocations")'),
    teamId: z.string().describe('Team/organization ID'),
    itemId: z.string().describe('The item ID to update'),
    data: z.record(z.string(), z.any()).describe('Fields to update as key-value pairs')
  },
  async handler({ collection, teamId, itemId, data }) {
    const col = getMcpCollectionByName(collection)
    if (!col) {
      return errorResult(`Collection "${collection}" not found. Use list-collections to see available collections.`)
    }

    try {
      const event = useEvent()
      await requireMcpAuth(event, teamId)

      const apiPath = getCollectionApiPath(col, teamId)
      const result = await $fetch(`${apiPath}/${itemId}`, {
        method: 'PATCH',
        body: data
      })

      return jsonResult(result)
    }
    catch (error: any) {
      return errorResult(`Error updating item: ${error.message || error}`)
    }
  }
})
