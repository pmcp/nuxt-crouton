import { z } from 'zod'

export default defineMcpTool({
  description: 'Delete an item from a Crouton collection. This action is permanent.',
  inputSchema: {
    collection: z.string().describe('Collection name (e.g., "bookingsLocations")'),
    teamId: z.string().describe('Team/organization ID'),
    itemId: z.string().describe('The item ID to delete')
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
      await $fetch(`${apiPath}/${itemId}`, {
        method: 'DELETE'
      })

      return jsonResult({ success: true, message: `Deleted item "${itemId}" from "${collection}".` })
    }
    catch (error: any) {
      return errorResult(`Error deleting item: ${error.message || error}`)
    }
  }
})
