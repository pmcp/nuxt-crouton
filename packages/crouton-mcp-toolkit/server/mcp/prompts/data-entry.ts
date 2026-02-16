import { z } from 'zod'

export default defineMcpPrompt({
  description: 'Guided data entry for a Crouton collection. Lists all available fields with their defaults and guides through creating a new item.',
  inputSchema: {
    collection: z.string().describe('Collection name to create an item in'),
    teamId: z.string().describe('Team/organization ID')
  },
  async handler({ collection, teamId }) {
    const col = getMcpCollectionByName(collection)

    if (!col) {
      const available = getMcpCollections().map(c => `- ${c.name} (${c.layer})`).join('\n')
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Collection "${collection}" not found. Available collections:\n${available}`
          }
        }]
      }
    }

    const fields = col.columns?.map(f => `- **${f.header}** (\`${f.accessorKey}\`): default = ${JSON.stringify(col.defaultValues?.[f.accessorKey] ?? null)}`).join('\n') || 'No fields defined'

    return {
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `I want to create a new item in the "${col.name}" collection (team: ${teamId}).

Here are the available fields:
${fields}

API endpoint: /api/teams/${teamId}/${col.apiPath}

Please ask me for the values for each field, then use the create-item tool to create the item.`
        }
      }]
    }
  }
})
