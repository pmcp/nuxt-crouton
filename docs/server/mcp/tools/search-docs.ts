import { z } from 'zod'

export default defineMcpTool({
  name: 'search_docs',
  description: 'Search the Nuxt Crouton documentation for relevant content. Returns matching pages and excerpts.',
  inputSchema: {
    query: z.string().describe('The search query to find in documentation')
  },
  async handler({ query }) {
    const { queryCollection } = await import('@nuxt/content/server')

    const results = await queryCollection('docs')
      .where('_path', 'NOT LIKE', '/landing%')
      .where('body', 'LIKE', `%${query}%`)
      .limit(10)
      .all()

    if (results.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: `No documentation found matching "${query}". Try a different search term or browse the sections: getting-started, fundamentals, generation, patterns, customization, features, advanced, api-reference, reference, guides`
        }]
      }
    }

    const formattedResults = results.map((doc) => {
      return `## ${doc.title || 'Untitled'}\n**Path:** ${doc._path}\n${doc.description || ''}`
    }).join('\n\n---\n\n')

    return {
      content: [{
        type: 'text' as const,
        text: `Found ${results.length} matching documents:\n\n${formattedResults}`
      }]
    }
  }
})
