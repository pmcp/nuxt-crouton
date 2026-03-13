/**
 * Seed script for Sint-Lukas Academie content migration
 *
 * Reads markdown files from the old sintLukas2024 project,
 * parses YAML frontmatter, and inserts into the local D1 database.
 *
 * Trigger via POST /api/seed/content
 *
 * Prerequisites:
 * - Organization must exist (run dev server first, create org via admin)
 * - Source files at /Users/pmcp/Projects/sintLukas2024/content/
 *
 * Order:
 * 1. Persons (16 records)
 * 2. Categories (6 records)
 * 3. Locations (8 records)
 * 4. News (9 records)
 * 5. Downloads (9 records)
 * 6. Ateliers (extracted from category files, ~15 records)
 */
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { organization, member } from '~~/server/db/schema'
import { contentPersons } from '~~/layers/content/collections/persons/server/database/schema'
import { contentCategories } from '~~/layers/content/collections/categories/server/database/schema'
import { contentLocations } from '~~/layers/content/collections/locations/server/database/schema'
import { contentNews } from '~~/layers/content/collections/news/server/database/schema'
import { contentDownloads } from '~~/layers/content/collections/downloads/server/database/schema'
import { contentAteliers } from '~~/layers/content/collections/ateliers/server/database/schema'

// ---------------------------------------------------------------------------
// Source paths
// ---------------------------------------------------------------------------
const SOURCE_ROOT = '/Users/pmcp/Projects/sintLukas2024/content'
const PERSONS_DIR = resolve(SOURCE_ROOT, 'persons/nl')
const AANBOD_DIR = resolve(SOURCE_ROOT, 'aanbod/nl')
const LOCATIONS_DIR = resolve(SOURCE_ROOT, 'locations/nl')
const NEWS_DIR = resolve(SOURCE_ROOT, 'news')
const DOWNLOADS_DIR = resolve(SOURCE_ROOT, 'media/downloads')

// ---------------------------------------------------------------------------
// YAML parser (handles the specific frontmatter format used by sintLukas2024)
// ---------------------------------------------------------------------------

interface ParsedFile {
  data: Record<string, any>
  content: string
}

function parseFrontmatter(md: string): ParsedFile {
  const match = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { data: {}, content: md }
  return {
    data: parseYaml(match[1]!),
    content: match[2]!.trim()
  }
}

/**
 * Parse YAML frontmatter. Handles:
 * - scalars, quoted strings, booleans
 * - multi-line block scalars (>- and >)
 * - arrays (- item)
 * - nested objects in arrays (ateliers structure)
 */
function parseYaml(yaml: string): Record<string, any> {
  const result: Record<string, any> = {}
  const lines = yaml.split('\n')
  let i = 0

  function getIndent(line: string): number {
    const m = line.match(/^(\s*)/)
    return m ? m[1]!.length : 0
  }

  function parseValue(raw: string): any {
    const trimmed = raw.trim()
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false
    if (trimmed === '""' || trimmed === "''") return ''
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      return trimmed.slice(1, -1)
    }
    return trimmed
  }

  // Collect a block scalar (>- or >) starting after the current line
  function collectBlockScalar(startIdx: number, baseIndent: number): { value: string; nextIdx: number } {
    const contentLines: string[] = []
    let j = startIdx
    while (j < lines.length) {
      const line = lines[j]!
      // Empty line is allowed inside block scalar
      if (line.trim() === '') {
        contentLines.push('')
        j++
        continue
      }
      const indent = getIndent(line)
      if (indent <= baseIndent) break
      contentLines.push(line.trim())
      j++
    }
    return { value: contentLines.join('\n'), nextIdx: j }
  }

  // Parse an array of objects (like ateliers) or simple values
  function parseArray(startIdx: number, baseIndent: number): { items: any[]; nextIdx: number } {
    const items: any[] = []
    let j = startIdx

    while (j < lines.length) {
      const line = lines[j]!
      if (line.trim() === '') { j++; continue }
      const indent = getIndent(line)
      if (indent <= baseIndent) break

      // Array item marker: "  - key: value" or "  - value"
      const arrayItemMatch = line.match(/^(\s+)-\s+(.*)$/)
      if (!arrayItemMatch) break

      const itemIndent = arrayItemMatch[1]!.length
      const firstContent = arrayItemMatch[2]!.trim()

      // Check if this is an object item (has key: value)
      const kvMatch = firstContent.match(/^([\w-]+):\s*(.*)$/)
      if (kvMatch) {
        // Object item in array
        const obj: Record<string, any> = {}
        const key = kvMatch[1]!
        const val = kvMatch[2]!.trim()

        if (val === '>-' || val === '>') {
          const block = collectBlockScalar(j + 1, itemIndent + 2)
          obj[key] = block.value
          j = block.nextIdx
        } else if (val === '') {
          // Could be nested array
          j++
          if (j < lines.length && lines[j]!.match(/^\s+-\s/)) {
            const nested = parseArray(j, itemIndent + 2)
            obj[key] = nested.items.map(i => typeof i === 'object' ? i : i)
            j = nested.nextIdx
          }
        } else {
          obj[key] = parseValue(val)
          j++
        }

        // Continue reading more key-value pairs at the same indentation level
        while (j < lines.length) {
          const nextLine = lines[j]!
          if (nextLine.trim() === '') { j++; continue }
          const nextIndent = getIndent(nextLine)
          // Stop if we hit another array item at the same level or go back
          if (nextIndent <= itemIndent) break
          if (nextLine.trim().startsWith('- ') && nextIndent === itemIndent + 2) {
            // This is a nested array item, handled below
          }

          const nextKvMatch = nextLine.match(/^(\s+)([\w-]+):\s*(.*)$/)
          if (nextKvMatch) {
            const nKey = nextKvMatch[2]!
            const nVal = nextKvMatch[3]!.trim()

            if (nVal === '>-' || nVal === '>') {
              const block = collectBlockScalar(j + 1, nextIndent)
              obj[nKey] = block.value
              j = block.nextIdx
            } else if (nVal === '') {
              // Check for nested array
              j++
              if (j < lines.length && lines[j]!.match(/^\s+-\s/)) {
                const nested = parseArray(j, nextIndent)
                obj[nKey] = nested.items.map(i => typeof i === 'object' ? i : String(i))
                j = nested.nextIdx
              }
            } else {
              obj[nKey] = parseValue(nVal)
              j++
            }
          } else {
            j++
          }
        }

        items.push(obj)
      } else {
        // Simple array item: "  - value"
        items.push(parseValue(firstContent))
        j++
      }
    }

    return { items, nextIdx: j }
  }

  while (i < lines.length) {
    const line = lines[i]!
    if (line.trim() === '') { i++; continue }

    const topMatch = line.match(/^([\w-]+):\s*(.*)$/)
    if (topMatch) {
      const key = topMatch[1]!
      const value = topMatch[2]!.trim()

      // Block scalar
      if (value === '>-' || value === '>') {
        const block = collectBlockScalar(i + 1, 0)
        result[key] = block.value
        i = block.nextIdx
        continue
      }

      // Check for array on next line
      if (value === '' && i + 1 < lines.length && lines[i + 1]!.match(/^\s+-\s/)) {
        const arr = parseArray(i + 1, 0)
        result[key] = arr.items
        i = arr.nextIdx
        continue
      }

      result[key] = parseValue(value)
    }
    i++
  }

  return result
}

// ---------------------------------------------------------------------------
// TipTap JSON builders
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

function textNode(str: string, marks?: TipTapNode['marks']): TipTapNode {
  const node: TipTapNode = { type: 'text', text: str }
  if (marks && marks.length > 0) node.marks = marks
  return node
}

function bold(str: string): TipTapNode {
  return textNode(str, [{ type: 'bold' }])
}

function italic(str: string): TipTapNode {
  return textNode(str, [{ type: 'italic' }])
}

function boldItalic(str: string): TipTapNode {
  return textNode(str, [{ type: 'bold' }, { type: 'italic' }])
}

function linkNode(label: string, href: string): TipTapNode {
  return textNode(label, [{ type: 'link', attrs: { href, target: '_blank', rel: 'noopener noreferrer nofollow', class: null } }])
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

// ---------------------------------------------------------------------------
// Markdown → TipTap JSON conversion
// ---------------------------------------------------------------------------

function parseInline(raw: string): TipTapNode[] {
  const nodes: TipTapNode[] = []
  // Match: bold+italic (***), bold (**), italic (*), links [text](url), email addresses
  const pattern = /\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]*)\]\(([^)]+)\)|([\w.+-]+@[\w.-]+\.\w+)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(textNode(raw.slice(lastIndex, match.index)))
    }

    if (match[1] !== undefined) {
      nodes.push(boldItalic(match[1]!))
    } else if (match[2] !== undefined) {
      nodes.push(bold(match[2]!))
    } else if (match[3] !== undefined) {
      nodes.push(italic(match[3]!))
    } else if (match[4] !== undefined) {
      nodes.push(linkNode(match[4]!, match[5]!))
    } else if (match[6] !== undefined) {
      nodes.push(linkNode(match[6]!, `mailto:${match[6]!}`))
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < raw.length) {
    nodes.push(textNode(raw.slice(lastIndex)))
  }

  return nodes.length > 0 ? nodes : [textNode(raw)]
}

function markdownToTipTap(md: string): string {
  if (!md || !md.trim()) return doc()

  // Clean up: remove :dispatch directives (Nuxt Content components)
  // Handles nested braces in :data='{"key":"value"}' attributes
  const cleaned = md.replace(/:dispatch\{(?:[^{}]|\{[^}]*\})*\}/g, '').trim()

  const rawBlocks = cleaned.split(/\n\n+/).filter(b => b.trim())
  const docNodes: TipTapNode[] = []

  for (const block of rawBlocks) {
    const trimmed = block.trim()

    // Heading (### ...)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1]!.length
      const inlineNodes = parseInline(headingMatch[2]!.trim())
      docNodes.push(heading(level, ...inlineNodes))
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

    // Regular paragraph — handle line breaks (\) and inline formatting
    const lines = trimmed.split('\n').map(l => l.replace(/\\$/, '').trim())
    const paraNodes: TipTapNode[] = []
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li]!
      if (!line) continue
      if (paraNodes.length > 0) {
        paraNodes.push(hardBreak())
      }
      paraNodes.push(...parseInline(line))
    }
    if (paraNodes.length > 0) {
      docNodes.push(paragraph(...paraNodes))
    }
  }

  return doc(...docNodes)
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
    // Find the organization
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

    // Clear existing seeded data
    await (db as any).delete(contentAteliers).where(eq(contentAteliers.teamId, orgId))
    await (db as any).delete(contentCategories).where(eq(contentCategories.teamId, orgId))
    await (db as any).delete(contentPersons).where(eq(contentPersons.teamId, orgId))
    await (db as any).delete(contentLocations).where(eq(contentLocations.teamId, orgId))
    await (db as any).delete(contentNews).where(eq(contentNews.teamId, orgId))
    await (db as any).delete(contentDownloads).where(eq(contentDownloads.teamId, orgId))
    log.push('Cleared existing content')

    // -------------------------------------------------------------------
    // 1. Seed Persons
    // -------------------------------------------------------------------
    const personFiles = readdirSync(PERSONS_DIR).filter(f => f.endsWith('.md')).sort()
    const oldPersonIdToNewId = new Map<string, string>()
    let personOrder = 0

    for (const file of personFiles) {
      const raw = readFileSync(resolve(PERSONS_DIR, file), 'utf-8')
      const { data } = parseFrontmatter(raw)

      if (!data.firstName) {
        log.push(`SKIP person (no firstName): ${file}`)
        continue
      }

      const personId = nanoid()
      const oldId = file.replace('.md', '')
      oldPersonIdToNewId.set(oldId, personId)

      await (db as any).insert(contentPersons).values({
        id: personId,
        teamId: orgId,
        owner: ownerId,
        order: personOrder++,
        firstName: data.firstName,
        lastName: data.lastName || '',
        role: data.info || null,
        image: data.image || null,
        createdAt: now,
        updatedAt: now,
        createdBy: ownerId,
        updatedBy: ownerId
      })
    }
    log.push(`Created ${oldPersonIdToNewId.size} persons`)

    // -------------------------------------------------------------------
    // 2. Seed Categories + extract Ateliers
    // -------------------------------------------------------------------
    const categoryFiles = readdirSync(AANBOD_DIR).filter(f => f.endsWith('.md')).sort()
    const oldCategoryIdToNewId = new Map<string, string>()
    let atelierCount = 0

    for (const file of categoryFiles) {
      const raw = readFileSync(resolve(AANBOD_DIR, file), 'utf-8')
      const { data } = parseFrontmatter(raw)

      if (!data.nl) {
        log.push(`SKIP category (no name): ${file}`)
        continue
      }

      const categoryId = nanoid()
      const oldId = file.replace('.md', '')
      oldCategoryIdToNewId.set(oldId, categoryId)

      await (db as any).insert(contentCategories).values({
        id: categoryId,
        teamId: orgId,
        owner: ownerId,
        order: typeof data.order === 'number' ? data.order : parseInt(data.order) || 0,
        title: data.nl,
        color: data.color || '#000000',
        thumbnail: data.thumb || null,
        background: data.background || null,
        isSidebar: data.side === true,
        translations: {
          nl: { title: data.nl }
        },
        createdAt: now,
        updatedAt: now,
        createdBy: ownerId,
        updatedBy: ownerId
      })

      // Extract ateliers from the category
      const ateliers = Array.isArray(data.ateliers) ? data.ateliers : []
      for (let ai = 0; ai < ateliers.length; ai++) {
        const atelier = ateliers[ai]!
        if (!atelier.title) continue

        const atelierId = nanoid()

        // Map person references (old IDs → new IDs)
        const personRefs: string[] = []
        if (Array.isArray(atelier.persons)) {
          for (const oldPersonId of atelier.persons) {
            const newId = oldPersonIdToNewId.get(String(oldPersonId))
            if (newId) personRefs.push(newId)
          }
        }

        // Convert markdown content to TipTap JSON
        const mainContent = atelier.markdown ? markdownToTipTap(String(atelier.markdown)) : null

        // Convert sidebar content (side2) to TipTap JSON
        const sidebarContent = atelier.side2 ? markdownToTipTap(String(atelier.side2)) : null

        // Image gallery
        const images = Array.isArray(atelier.images) ? atelier.images.map(String) : null

        await (db as any).insert(contentAteliers).values({
          id: atelierId,
          teamId: orgId,
          owner: ownerId,
          order: atelierCount,
          title: atelier.title,
          category: categoryId,
          age: atelier.age || null,
          mainImage: atelier.mainImage || null,
          cardImage: atelier.thumb || null,
          content: mainContent,
          sidebarContent,
          persons: personRefs.length > 0 ? personRefs : null,
          images,
          status: 'published',
          translations: {
            nl: {
              title: atelier.title,
              age: atelier.age || undefined,
              content: mainContent || undefined,
              sidebarContent: sidebarContent || undefined
            }
          },
          createdAt: now,
          updatedAt: now,
          createdBy: ownerId,
          updatedBy: ownerId
        })

        atelierCount++
      }
    }
    log.push(`Created ${oldCategoryIdToNewId.size} categories`)
    log.push(`Created ${atelierCount} ateliers`)

    // -------------------------------------------------------------------
    // 3. Seed Locations
    // -------------------------------------------------------------------
    const locationFiles = readdirSync(LOCATIONS_DIR).filter(f => f.endsWith('.md')).sort()
    let locationCount = 0

    for (const file of locationFiles) {
      const raw = readFileSync(resolve(LOCATIONS_DIR, file), 'utf-8')
      const { data } = parseFrontmatter(raw)

      if (!data.name) {
        log.push(`SKIP location (no name): ${file}`)
        continue
      }

      const locationId = nanoid()

      // Parse GeoJSON coordinates from location field
      let locationCoords: string | null = null
      if (data.location) {
        try {
          const geo = JSON.parse(data.location)
          if (geo.coordinates) {
            // Store as "lat,lng" for crouton-maps compatibility
            locationCoords = `${geo.coordinates[1]},${geo.coordinates[0]}`
          }
        } catch {
          locationCoords = data.location
        }
      }

      // Convert info markdown to TipTap JSON if present
      const infoContent = data.info ? markdownToTipTap(String(data.info)) : null

      await (db as any).insert(contentLocations).values({
        id: locationId,
        teamId: orgId,
        owner: ownerId,
        order: locationCount,
        title: data.name,
        street: data.street || '',
        zip: data.zip || '',
        city: data.city || '',
        location: locationCoords,
        info: infoContent,
        isMain: data.name === 'Hoofdschool',
        translations: {
          nl: {
            title: data.name,
            info: infoContent || undefined
          }
        },
        createdAt: now,
        updatedAt: now,
        createdBy: ownerId,
        updatedBy: ownerId
      })

      locationCount++
    }
    log.push(`Created ${locationCount} locations`)

    // -------------------------------------------------------------------
    // 4. Seed News
    // -------------------------------------------------------------------
    const newsFiles = readdirSync(NEWS_DIR).filter(f => f.endsWith('.md')).sort()
    let newsCount = 0

    for (const file of newsFiles) {
      const raw = readFileSync(resolve(NEWS_DIR, file), 'utf-8')
      const { data } = parseFrontmatter(raw)

      if (!data.title) {
        log.push(`SKIP news (no title): ${file}`)
        continue
      }

      const newsId = nanoid()
      const date = data.date ? new Date(data.date) : now

      await (db as any).insert(contentNews).values({
        id: newsId,
        teamId: orgId,
        owner: ownerId,
        order: newsCount,
        title: data.title,
        date,
        image: data.image || null,
        text: data.text || null,
        link: data.link || null,
        status: 'published',
        translations: {
          nl: {
            title: data.title,
            text: data.text || undefined
          }
        },
        createdAt: now,
        updatedAt: now,
        createdBy: ownerId,
        updatedBy: ownerId
      })

      newsCount++
    }
    log.push(`Created ${newsCount} news items`)

    // -------------------------------------------------------------------
    // 5. Seed Downloads
    // -------------------------------------------------------------------
    const downloadFiles = readdirSync(DOWNLOADS_DIR).filter(f => f.endsWith('.md')).sort()
    let downloadCount = 0

    for (const file of downloadFiles) {
      const raw = readFileSync(resolve(DOWNLOADS_DIR, file), 'utf-8')
      const { data } = parseFrontmatter(raw)

      if (!data.file) {
        log.push(`SKIP download (no file): ${file}`)
        continue
      }

      const downloadId = nanoid()

      await (db as any).insert(contentDownloads).values({
        id: downloadId,
        teamId: orgId,
        owner: ownerId,
        order: downloadCount,
        title: data.buttonLabel || data.internalName || 'Untitled',
        internalName: data.internalName || null,
        file: data.file,
        translations: {
          nl: {
            title: data.buttonLabel || data.internalName || undefined
          }
        },
        createdAt: data.date ? new Date(data.date) : now,
        updatedAt: now,
        createdBy: ownerId,
        updatedBy: ownerId
      })

      downloadCount++
    }
    log.push(`Created ${downloadCount} downloads`)

    // -------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------
    return {
      success: true,
      organizationId: orgId,
      summary: log,
      counts: {
        persons: oldPersonIdToNewId.size,
        categories: oldCategoryIdToNewId.size,
        ateliers: atelierCount,
        locations: locationCount,
        news: newsCount,
        downloads: downloadCount
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
