/**
 * Fix image nodes: convert TipTap `image` nodes → `imageBlock` nodes
 *
 * The block editor uses `imageBlock` (block-level) not `image` (inline).
 * This script walks all article content JSON and converts any `image` nodes
 * to `imageBlock` nodes with the correct attributes.
 *
 * Also handles inline images inside paragraphs by extracting them as
 * separate block-level nodes.
 *
 * Trigger via POST /api/seed/fix-image-nodes
 */
import { eq } from 'drizzle-orm'
import { contentArticles } from '~~/layers/content/collections/articles/server/database/schema'
import { organization } from '~~/server/db/schema'

interface TipTapNode {
  type: string
  attrs?: Record<string, any>
  content?: TipTapNode[]
  marks?: Array<{ type: string; attrs?: Record<string, any> }>
  text?: string
}

/**
 * Walk a TipTap doc and convert `image` nodes to `imageBlock` nodes.
 * Since imageBlock is block-level, inline images inside paragraphs
 * are extracted and placed after the paragraph.
 */
function fixImageNodes(doc: TipTapNode): TipTapNode {
  if (!doc.content) return doc

  const newContent: TipTapNode[] = []

  for (const node of doc.content) {
    if (node.type === 'image') {
      // Top-level image → convert to imageBlock
      newContent.push({
        type: 'imageBlock',
        attrs: {
          src: node.attrs?.src || '',
          alt: node.attrs?.alt || '',
          caption: '',
          width: 'full'
        }
      })
    } else if (node.content && hasInlineImages(node.content)) {
      // Node contains inline images — extract them
      const { inlineNodes, extractedImages } = extractInlineImages(node.content)

      // Push the parent node with remaining inline content (if any)
      if (inlineNodes.length > 0) {
        newContent.push({ ...node, content: inlineNodes })
      }

      // Push extracted images as block-level nodes
      for (const img of extractedImages) {
        newContent.push({
          type: 'imageBlock',
          attrs: {
            src: img.attrs?.src || '',
            alt: img.attrs?.alt || '',
            caption: '',
            width: 'full'
          }
        })
      }
    } else if (node.content) {
      // Recurse into nested content (blockquote, listItem, etc.)
      newContent.push(fixImageNodes(node))
    } else {
      newContent.push(node)
    }
  }

  return { ...doc, content: newContent }
}

function hasInlineImages(nodes: TipTapNode[]): boolean {
  return nodes.some(n => n.type === 'image')
}

function extractInlineImages(nodes: TipTapNode[]): {
  inlineNodes: TipTapNode[]
  extractedImages: TipTapNode[]
} {
  const inlineNodes: TipTapNode[] = []
  const extractedImages: TipTapNode[] = []

  for (const node of nodes) {
    if (node.type === 'image') {
      extractedImages.push(node)
    } else {
      inlineNodes.push(node)
    }
  }

  return { inlineNodes, extractedImages }
}

export default defineEventHandler(async () => {
  if (!import.meta.dev) {
    throw createError({ status: 403, statusText: 'Dev only' })
  }

  const db = useDB()
  const log: string[] = []

  const orgs = await (db as any).select().from(organization).limit(1)
  if (orgs.length === 0) {
    throw createError({ status: 404, statusText: 'No organization found' })
  }
  const orgId = orgs[0].id

  const articles = await (db as any).select().from(contentArticles).where(eq(contentArticles.teamId, orgId))
  log.push(`Found ${articles.length} articles`)

  let fixed = 0
  let withImageBlock = 0
  let withOldImage = 0
  let withImageUrl = 0
  let withBlobImages = 0

  for (const article of articles) {
    if (article.imageUrl) withImageUrl++
    if (article.imageUrl?.startsWith('/images/')) withBlobImages++
    if (!article.content) continue

    const contentStr = article.content
    if (contentStr.includes('"type":"imageBlock"')) withImageBlock++
    if (contentStr.includes('"type":"image"') && !contentStr.includes('"type":"imageBlock"')) withOldImage++

    // Check if content has any `image` nodes (not `imageBlock`)
    if (!contentStr.includes('"type":"image"')) continue

    let doc: TipTapNode
    try {
      doc = JSON.parse(contentStr)
    } catch {
      continue
    }

    const fixedDoc = fixImageNodes(doc)
    const newContent = JSON.stringify(fixedDoc)

    if (newContent !== contentStr) {
      await (db as any).update(contentArticles)
        .set({ content: newContent, updatedAt: new Date() })
        .where(eq(contentArticles.id, article.id))
      fixed++
    }
  }

  // Collect titles and image srcs of articles that have imageBlock in content
  const imageBlockTitles: string[] = []
  const sampleImages: Record<string, string[]> = {}
  for (const article of articles) {
    if (article.content?.includes('"type":"imageBlock"')) {
      imageBlockTitles.push(article.title)
      // Extract image srcs
      try {
        const doc = JSON.parse(article.content)
        const srcs: string[] = []
        const walk = (node: any) => {
          if (node.type === 'imageBlock' && node.attrs?.src) srcs.push(node.attrs.src)
          if (node.content) node.content.forEach(walk)
        }
        walk(doc)
        if (srcs.length > 0 && article.title === 'Tot nu toe') sampleImages[article.title] = srcs
      } catch {}
    }
  }

  log.push(`Articles with imageBlock in content: ${withImageBlock}`)
  log.push(`Articles with old image nodes: ${withOldImage}`)
  log.push(`Articles with imageUrl set: ${withImageUrl}`)
  log.push(`Articles with blob imageUrl (/images/...): ${withBlobImages}`)
  log.push(`Fixed ${fixed} articles (converted image → imageBlock nodes)`)

  return { success: true, fixed, log, imageBlockTitles, sampleImages }
})
