import { z } from 'zod'

export default defineMcpTool({
  description: 'Create a new item in a Crouton collection. Use list-collections first to see available fields and default values.',
  inputSchema: {
    collection: z.string().describe('Collection name (e.g., "bookingsLocations")'),
    teamId: z.string().describe('Team/organization ID'),
    data: z.record(z.string(), z.any()).describe('Item data as key-value pairs matching the collection fields')
  },
  async handler({ collection, teamId, data }) {
    const col = getMcpCollectionByName(collection)
    if (!col) {
      return errorResult(`Collection "${collection}" not found. Use list-collections to see available collections.`)
    }

    try {
      const event = useEvent()
      await requireMcpAuth(event, teamId)

      const apiPath = getCollectionApiPath(col, teamId)
      const result = await $fetch(apiPath, {
        method: 'POST',
        body: data
      })

      return jsonResult(result)
    }
    catch (error: any) {
      return errorResult(`Error creating item: ${error.message || error}`)
    }
  }
})
