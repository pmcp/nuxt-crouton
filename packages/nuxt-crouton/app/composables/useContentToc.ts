import type { TocLink } from '../types/content'

/**
 * Extracts table of contents links from HTML content.
 * Scans for h2-h4 headings and returns structured TOC data.
 */
export type { TocLink }

export function useContentToc(content: MaybeRef<string | null | undefined>) {
  const tocLinks = computed<TocLink[]>(() => {
    const html = unref(content)
    if (!html) return []

    const headingRegex = /<h([2-4])[^>]*(?:id="([^"]*)")?[^>]*>([^<]*)<\/h[2-4]>/gi
    const links: TocLink[] = []
    let match

    while ((match = headingRegex.exec(html)) !== null) {
      const depth = parseInt(match[1] || '2')
      const headingText = match[3] || ''
      // Use existing id or generate from text
      const id = match[2] || headingText.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
      const text = headingText.trim()

      if (text) {
        links.push({ id, text, depth })
      }
    }

    return links
  })

  return { tocLinks }
}
