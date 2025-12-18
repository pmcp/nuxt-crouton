import { z } from 'zod'

export default defineMcpTool({
  name: 'get_page',
  description: 'Get the full content of a specific documentation page by path. Use this after search_docs to get detailed content.',
  inputSchema: {
    path: z.string().describe('The documentation path (e.g., "/getting-started", "/fundamentals/collections", "/api-reference/composables")')
  },
  async handler({ path }) {
    const { queryCollection } = await import('@nuxt/content/server')

    // Normalize path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    const results = await queryCollection('docs')
      .where('_path', 'LIKE', `%${normalizedPath}%`)
      .limit(1)
      .all()

    if (results.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: `Page not found at path "${normalizedPath}". Use search_docs or list_sections to find available pages.`
        }]
      }
    }

    const doc = results[0]

    // Extract text content from body if available
    let bodyText = ''
    if (doc.body && Array.isArray(doc.body)) {
      bodyText = extractText(doc.body)
    }

    return {
      content: [{
        type: 'text' as const,
        text: `# ${doc.title || 'Untitled'}\n\n**Path:** ${doc._path}\n**Description:** ${doc.description || 'N/A'}\n\n---\n\n${bodyText || 'Content not available in text format. Please visit the documentation website for full content.'}`
      }]
    }
  }
})

function extractText(nodes: any[]): string {
  let text = ''
  for (const node of nodes) {
    if (typeof node === 'string') {
      text += node
    } else if (node.type === 'text' && node.value) {
      text += node.value
    } else if (node.children && Array.isArray(node.children)) {
      text += extractText(node.children)
    }
    if (node.tag === 'p' || node.tag?.startsWith('h')) {
      text += '\n\n'
    }
  }
  return text.trim()
}
