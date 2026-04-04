import type { Root, Text, PhrasingContent } from 'mdast'
import { visit } from 'unist-util-visit'

const WIKI_LINK_RE = /\[\[([^\]]+)\]\]/g

/**
 * Remark plugin that transforms [[wiki links]] into MDC inline components.
 *
 * Supports two forms:
 * - [[node title]]  → resolves by title (convenience)
 * - [[#nodeId]]     → resolves by ID (stable form)
 *
 * Outputs `textComponent` nodes (MDC inline components) with name `wiki-link`.
 */
export default function remarkWikiLinks() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      if (!WIKI_LINK_RE.test(node.value)) return

      // Reset regex state
      WIKI_LINK_RE.lastIndex = 0

      const children: PhrasingContent[] = []
      let lastIndex = 0

      for (const match of node.value.matchAll(WIKI_LINK_RE)) {
        const [full, inner] = match
        const start = match.index!

        // Text before match
        if (start > lastIndex) {
          children.push({ type: 'text', value: node.value.slice(lastIndex, start) })
        }

        // Determine if it's a nodeId ref (#id) or title ref
        const isIdRef = inner.startsWith('#')
        const attributes: Record<string, string> = isIdRef
          ? { 'node-id': inner.slice(1) }
          : { title: inner }

        // MDC textComponent node — rendered as inline :wiki-link{props}[content]
        children.push({
          type: 'textComponent' as any,
          name: 'wiki-link',
          attributes,
          children: [{ type: 'text', value: isIdRef ? inner.slice(1) : inner }],
        })

        lastIndex = start + full.length
      }

      // Remaining text after last match
      if (lastIndex < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(lastIndex) })
      }

      // Replace the original text node with our split nodes
      parent.children.splice(index, 1, ...children as any[])
    })
  }
}
