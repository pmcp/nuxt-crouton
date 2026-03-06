/**
 * Seed script for alexdeforce content migration
 *
 * Reads all markdown files from the old alexdeforce_v2 site,
 * parses YAML frontmatter + markdown body, converts to TipTap JSON,
 * and inserts into the local D1 database.
 *
 * Content is stored as TipTap JSON (same format as crouton-pages).
 * Iframes (YouTube, Bandcamp, etc.) are extracted into the `embed` field.
 *
 * Trigger via POST /api/seed/content
 *
 * Prerequisites:
 * - Organization must exist (run dev server first, create org via admin)
 * - Source files at /Users/pmcp/Projects/alexdeforce_v2/content/
 *
 * Order:
 * 1. Articles (163 markdown files)
 * 2. Agenda items (81 markdown files)
 */
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { organization, member } from '~~/server/db/schema'
import { contentArticles } from '~~/layers/content/collections/articles/server/database/schema'
import { contentAgendas } from '~~/layers/content/collections/agendas/server/database/schema'

// ---------------------------------------------------------------------------
// Source paths
// ---------------------------------------------------------------------------
const SOURCE_ROOT = '/Users/pmcp/Projects/alexdeforce_v2/content'
const ARTICLES_DIR = resolve(SOURCE_ROOT, 'articles')
const AGENDA_DIR = resolve(SOURCE_ROOT, 'agenda')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse YAML frontmatter from markdown */
function parseFrontmatter(md: string): { data: Record<string, any>; content: string } {
  const match = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { data: {}, content: md }
  return {
    data: parseSimpleYaml(match[1]!),
    content: match[2]!.trim()
  }
}

/**
 * Minimal YAML parser for alexdeforce frontmatter.
 * Handles: scalars, quoted strings, arrays (- item), inline URLs
 */
function parseSimpleYaml(yaml: string): Record<string, any> {
  const result: Record<string, any> = {}
  const lines = yaml.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!
    if (line.trim() === '') { i++; continue }

    // Top-level key: value
    const topMatch = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (topMatch) {
      const key = topMatch[1]!
      let value = topMatch[2]!.trim()

      // Check if next lines are array items (  - value)
      if (value === '' && i + 1 < lines.length && lines[i + 1]!.match(/^\s+-\s/)) {
        const items: string[] = []
        i++
        while (i < lines.length && lines[i]!.match(/^\s+-\s/)) {
          const itemMatch = lines[i]!.match(/^\s+-\s+(.*)$/)
          if (itemMatch) items.push(itemMatch[1]!.trim())
          i++
        }
        result[key] = items
        continue
      }

      // Remove surrounding quotes
      if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
        value = value.slice(1, -1)
      }

      // Handle booleans
      if (value === 'true') { result[key] = true; i++; continue }
      if (value === 'false') { result[key] = false; i++; continue }

      // Handle empty strings
      if (value === '""' || value === "''") { result[key] = ''; i++; continue }

      result[key] = value
    }
    i++
  }

  return result
}

// ---------------------------------------------------------------------------
// TipTap JSON builders (same pattern as velo pages-fix.post.ts)
// ---------------------------------------------------------------------------

interface TipTapNode {
  type: string
  attrs?: Record<string, any>
  content?: TipTapNode[]
  marks?: Array<{ type: string; attrs?: Record<string, any> }>
  text?: string
}

function doc(...content: TipTapNode[]): string {
  return JSON.stringify({
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }]
  })
}

function heading(level: number, ...content: TipTapNode[]): TipTapNode {
  return { type: 'heading', attrs: { level }, content }
}

function paragraph(...content: TipTapNode[]): TipTapNode {
  if (content.length === 0) return { type: 'paragraph' }
  return { type: 'paragraph', content }
}

function text(str: string, marks?: TipTapNode['marks']): TipTapNode {
  const node: TipTapNode = { type: 'text', text: str }
  if (marks && marks.length > 0) node.marks = marks
  return node
}

function bold(str: string): TipTapNode {
  return text(str, [{ type: 'bold' }])
}

function italic(str: string): TipTapNode {
  return text(str, [{ type: 'italic' }])
}

function link(label: string, href: string): TipTapNode {
  return text(label, [{ type: 'link', attrs: { href, target: '_blank', rel: 'noopener noreferrer nofollow', class: null } }])
}

function image(src: string, alt?: string): TipTapNode {
  return { type: 'image', attrs: { src, alt: alt || null } }
}

function hardBreak(): TipTapNode {
  return { type: 'hardBreak' }
}

function bulletList(...items: TipTapNode[][]): TipTapNode {
  return {
    type: 'bulletList',
    content: items.map(itemContent => ({
      type: 'listItem',
      content: [paragraph(...itemContent)]
    }))
  }
}

function blockquote(...content: TipTapNode[]): TipTapNode {
  return { type: 'blockquote', content }
}

// ---------------------------------------------------------------------------
// Markdown → TipTap JSON conversion
// ---------------------------------------------------------------------------

/** Parse inline markdown into TipTap text nodes with marks */
function parseInline(raw: string): TipTapNode[] {
  const nodes: TipTapNode[] = []

  // Regex to match inline patterns: images, links, bold, italic
  // Process in order: images first, then links, then bold, then italic
  const pattern = /!\[([^\]]*)\]\(([^)"\s]+)(?:\s+"([^"]*)")?\)|\[([^\]]*)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(raw)) !== null) {
    // Add preceding plain text
    if (match.index > lastIndex) {
      nodes.push(text(raw.slice(lastIndex, match.index)))
    }

    if (match[1] !== undefined || match[2] !== undefined) {
      // Image: ![alt](src)
      nodes.push(image(match[2]!, match[1] || undefined))
    } else if (match[4] !== undefined) {
      // Link: [label](href)
      nodes.push(link(match[4]!, match[5]!))
    } else if (match[6] !== undefined) {
      // Bold: **text**
      nodes.push(bold(match[6]!))
    } else if (match[7] !== undefined) {
      // Italic: *text*
      nodes.push(italic(match[7]!))
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < raw.length) {
    nodes.push(text(raw.slice(lastIndex)))
  }

  return nodes.length > 0 ? nodes : [text(raw)]
}

/**
 * Convert markdown body to TipTap JSON and extract iframes.
 * Returns { content: TipTap JSON string, embeds: extracted iframe HTML[] }
 */
function markdownToTipTap(md: string): { content: string; embeds: string[] } {
  if (!md || !md.trim()) {
    return { content: doc(), embeds: [] }
  }

  const rawBlocks = md.split(/\n\n+/).filter(b => b.trim())
  const docNodes: TipTapNode[] = []
  const embeds: string[] = []

  for (const block of rawBlocks) {
    const trimmed = block.trim()

    // Extract iframes and raw HTML embeds → embed field
    if (trimmed.startsWith('<iframe') || (trimmed.startsWith('<div') && trimmed.includes('<iframe'))) {
      embeds.push(trimmed)
      continue
    }

    // Heading (### ...)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1]!.length
      const inlineNodes = parseInline(headingMatch[2]!.trim())
      docNodes.push(heading(level, ...inlineNodes))
      continue
    }

    // Blockquote (> lines)
    if (trimmed.split('\n').every(l => l.trim().startsWith('>') || l.trim() === '')) {
      const lines = trimmed
        .split('\n')
        .map(l => l.trim().replace(/^>\s*/, '').replace(/^"/, '').replace(/"$/, ''))
        .filter(l => l)
      // Each quote line becomes a paragraph inside blockquote
      const quoteContent = lines.map(l => paragraph(...parseInline(l)))
      docNodes.push(blockquote(...quoteContent))
      continue
    }

    // List items (lines starting with * or -)
    if (trimmed.split('\n').some(l => l.trim().match(/^[\*\-]\s/))) {
      const items = trimmed
        .split('\n')
        .filter(l => l.trim())
        .map(l => l.trim().replace(/^[\*\-]\s*/, '').trim())
        .filter(t => t)
        .map(t => parseInline(t))
      if (items.length > 0) {
        docNodes.push(bulletList(...items))
      }
      continue
    }

    // Image-only line: ![alt](src)
    const imgOnlyMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)"\s]+)(?:\s+"([^"]*)")?\)$/)
    if (imgOnlyMatch) {
      docNodes.push(image(imgOnlyMatch[2]!, imgOnlyMatch[1] || undefined))
      continue
    }

    // Regular paragraph — handle line breaks (\) and inline formatting
    const lines = trimmed.split('\n').map(l => l.replace(/\\$/, '').trim())
    const paraNodes: TipTapNode[] = []
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li]!
      if (!line) continue

      // Check if line is a standalone image
      const lineImgMatch = line.match(/^!\[([^\]]*)\]\(([^)"\s]+)(?:\s+"([^"]*)")?\)$/)
      if (lineImgMatch) {
        // Flush current paragraph if it has content, then add image as separate node
        if (paraNodes.length > 0) {
          docNodes.push(paragraph(...paraNodes.splice(0)))
        }
        docNodes.push(image(lineImgMatch[2]!, lineImgMatch[1] || undefined))
        continue
      }

      // Check if line starts with an iframe (inline with text, e.g. bandcamp + credits)
      if (line.startsWith('<iframe')) {
        embeds.push(line)
        continue
      }

      if (paraNodes.length > 0) {
        paraNodes.push(hardBreak())
      }
      paraNodes.push(...parseInline(line))
    }
    if (paraNodes.length > 0) {
      docNodes.push(paragraph(...paraNodes))
    }
  }

  return {
    content: doc(...docNodes),
    embeds
  }
}

// ---------------------------------------------------------------------------
// Main seed handler
// ---------------------------------------------------------------------------

export default defineEventHandler(async () => {
  if (!import.meta.dev) {
    throw createError({ status: 403, statusText: 'Seed endpoint is only available in development' })
  }

  const db = useDB()
  const log: string[] = []
  const now = new Date()

  try {
    // Find the organization (should exist from first dev boot)
    const orgs = await (db as any).select().from(organization).limit(1)
    if (orgs.length === 0) {
      throw createError({
        status: 404,
        statusText: 'No organization found. Start the dev server and create one via admin first.'
      })
    }
    const orgId = orgs[0].id

    // Find an actual user to use as owner
    const members = await (db as any).select().from(member).where(eq(member.organizationId, orgId)).limit(1)
    const ownerId = members?.[0]?.userId || orgId

    log.push(`Using organization: ${orgs[0].name} (${orgId})`)

    // -------------------------------------------------------------------
    // 1. Migrate Articles
    // -------------------------------------------------------------------
    const articleFiles = readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md')).sort()
    let articleCount = 0
    let articleSkipped = 0

    for (const file of articleFiles) {
      const filePath = resolve(ARTICLES_DIR, file)
      const raw = readFileSync(filePath, 'utf-8')
      const { data, content } = parseFrontmatter(raw)

      if (!data.title) {
        log.push(`SKIP article (no title): ${file}`)
        articleSkipped++
        continue
      }

      // Parse date
      const date = data.date ? new Date(data.date) : now

      // Handle image field: can be string or array
      let imageUrl: string | null = null
      if (Array.isArray(data.image)) {
        imageUrl = data.image[0] || null
      } else if (typeof data.image === 'string' && data.image) {
        imageUrl = data.image
      }

      // Parse tags: already an array from YAML parser
      const tags = Array.isArray(data.tags) ? data.tags : []

      // Convert markdown body to TipTap JSON, extracting iframes
      const { content: tipTapContent, embeds: bodyEmbeds } = markdownToTipTap(content)

      // Merge frontmatter embed + body iframes into single embed field
      const allEmbeds: string[] = []
      if (typeof data.embed === 'string' && data.embed && data.embed !== '""') {
        allEmbeds.push(data.embed)
      }
      allEmbeds.push(...bodyEmbeds)
      const embed = allEmbeds.length > 0 ? allEmbeds.join('\n') : null

      const articleId = nanoid()
      await (db as any).insert(contentArticles).values({
        id: articleId,
        teamId: orgId,
        owner: ownerId,
        order: articleCount,
        title: data.title,
        date,
        category: data.category || 'txt',
        content: tipTapContent,
        embed,
        imageUrl,
        tags,
        featured: data.featured === true,
        draft: data.draft === true,
        createdAt: date,
        updatedAt: date,
        createdBy: ownerId,
        updatedBy: ownerId
      })

      articleCount++
    }

    log.push(`Created ${articleCount} articles (${articleSkipped} skipped)`)

    // -------------------------------------------------------------------
    // 2. Migrate Agenda Items
    // -------------------------------------------------------------------
    const agendaFiles = readdirSync(AGENDA_DIR).filter(f => f.endsWith('.md')).sort()
    let agendaCount = 0
    let agendaSkipped = 0

    for (const file of agendaFiles) {
      const filePath = resolve(AGENDA_DIR, file)
      const raw = readFileSync(filePath, 'utf-8')
      const { data, content } = parseFrontmatter(raw)

      if (!data.title) {
        log.push(`SKIP agenda (no title): ${file}`)
        agendaSkipped++
        continue
      }

      // Parse date
      const date = data.date ? new Date(data.date) : now

      // Handle thumbnail (agenda uses 'thumbnail' field, but source might use 'image')
      let thumbnail: string | null = null
      if (typeof data.thumbnail === 'string' && data.thumbnail) {
        thumbnail = data.thumbnail
      } else if (Array.isArray(data.image)) {
        thumbnail = data.image[0] || null
      } else if (typeof data.image === 'string' && data.image) {
        thumbnail = data.image
      }

      // Convert markdown body to TipTap JSON (iframes go to content for agenda)
      const { content: tipTapContent } = markdownToTipTap(content)

      const agendaId = nanoid()
      await (db as any).insert(contentAgendas).values({
        id: agendaId,
        teamId: orgId,
        owner: ownerId,
        order: agendaCount,
        title: data.title,
        date,
        content: tipTapContent,
        thumbnail,
        draft: data.draft === true,
        createdAt: date,
        updatedAt: date,
        createdBy: ownerId,
        updatedBy: ownerId
      })

      agendaCount++
    }

    log.push(`Created ${agendaCount} agenda items (${agendaSkipped} skipped)`)

    // -------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------
    return {
      success: true,
      organizationId: orgId,
      summary: log,
      counts: {
        articles: articleCount,
        agenda: agendaCount,
        articlesSkipped: articleSkipped,
        agendaSkipped: agendaSkipped
      }
    }
  } catch (error: any) {
    if (error.statusCode || error.status) throw error
    console.error('Seed error:', error)
    throw createError({
      status: 500,
      statusText: `Seed failed: ${error.message}\n${error.stack || ''}`
    })
  }
})
