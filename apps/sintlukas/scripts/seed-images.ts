/**
 * Standalone image migration script for Sint-Lukas.
 *
 * Bypasses the Nuxt dev server entirely:
 * - Copies images to .data/blob/sintlukas/ (NuxtHub local blob storage)
 * - Updates SQLite DB directly via better-sqlite3
 *
 * Usage: npx tsx scripts/seed-images.ts
 * Run from apps/sintlukas/
 */
import { readdirSync, readFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { resolve, basename, extname } from 'node:path'
import Database from 'better-sqlite3'
import { nanoid } from 'nanoid'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const APP_DIR = resolve(import.meta.dirname, '..')
const SOURCE_ROOT = '/Users/pmcp/Projects/sintLukas2024'
const IMAGES_META_DIR = resolve(SOURCE_ROOT, 'content/media/images')
const UPLOADS_DIR = resolve(SOURCE_ROOT, 'public/assets/uploads')
const BLOB_DIR = resolve(APP_DIR, '.data/blob/sintlukas')
const DB_PATH = resolve(APP_DIR, '.data/db/sqlite.db')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getContentType(filename: string): string {
  const ext = extname(filename).toLowerCase()
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.avif': 'image/avif'
  }
  return types[ext] || 'image/jpeg'
}

function parseFrontmatter(md: string): Record<string, string> {
  const match = md.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const result: Record<string, string> = {}
  for (const line of match[1]!.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/)
    if (kv) result[kv[1]!] = kv[2]!.trim()
  }
  return result
}

/** Build mapping of asset ID → local file path */
function buildAssetIdMap(): Map<string, string> {
  const map = new Map<string, string>()
  if (!existsSync(IMAGES_META_DIR)) return map

  const files = readdirSync(IMAGES_META_DIR).filter(f => f.endsWith('.md'))
  for (const file of files) {
    const raw = readFileSync(resolve(IMAGES_META_DIR, file), 'utf-8')
    const data = parseFrontmatter(raw)
    if (data.id && data.cover) {
      const localPath = resolve(SOURCE_ROOT, 'public', data.cover.replace(/^\//, ''))
      map.set(data.id, localPath)
    }
  }
  return map
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('Sint-Lukas image migration\n')

// Ensure blob directory exists
mkdirSync(BLOB_DIR, { recursive: true })

// Open database
if (!existsSync(DB_PATH)) {
  console.error(`Database not found at ${DB_PATH}`)
  console.error('Start the dev server at least once to create the database.')
  process.exit(1)
}
const db = new Database(DB_PATH)

// Find org
const org = db.prepare('SELECT id FROM organization LIMIT 1').get() as any
if (!org) {
  console.error('No organization found in database. Create one via the admin first.')
  process.exit(1)
}
const orgId = org.id
const memberRow = db.prepare('SELECT userId FROM member WHERE organizationId = ? LIMIT 1').get(orgId) as any
const ownerId = memberRow?.userId || orgId

console.log(`Organization: ${orgId}`)

// Build asset ID map
const assetIdMap = buildAssetIdMap()
console.log(`Asset ID map: ${assetIdMap.size} entries`)

// Track uploads to avoid duplicates
const uploadedPaths = new Map<string, string>() // localPath → /images/sintlukas/filename
let uploaded = 0
let failed = 0

// Clear existing assets
db.prepare('DELETE FROM crouton_assets WHERE teamId = ?').run(orgId)
console.log('Cleared existing asset records\n')

function copyAndTrack(localPath: string): string | null {
  if (uploadedPaths.has(localPath)) return uploadedPaths.get(localPath)!
  if (!existsSync(localPath)) {
    console.log(`  NOT FOUND: ${localPath}`)
    failed++
    return null
  }

  const filename = basename(localPath)
  const blobPath = `sintlukas/${filename}`
  const destPath = resolve(BLOB_DIR, filename)
  const imagePath = `/images/${blobPath}`

  // Copy file to blob storage
  copyFileSync(localPath, destPath)
  uploadedPaths.set(localPath, imagePath)

  // Create asset record
  const contentType = getContentType(filename)
  const size = readFileSync(localPath).length
  const now = Date.now()
  db.prepare(`
    INSERT INTO crouton_assets (id, teamId, owner, "order", userId, filename, pathname, contentType, size, category, uploadedAt, createdAt, updatedAt, createdBy, updatedBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'image', ?, ?, ?, ?, ?)
  `).run(nanoid(), orgId, ownerId, uploaded, ownerId, filename, blobPath, contentType, size, now, now, now, ownerId, ownerId)

  uploaded++
  return imagePath
}

function resolveImageRef(ref: string): string | null {
  if (!ref) return null

  // Check if it's an asset ID
  const localPathFromId = assetIdMap.get(ref)
  if (localPathFromId) return copyAndTrack(localPathFromId)

  // Direct file path like /assets/uploads/lucia.png
  const localPath = resolve(SOURCE_ROOT, 'public', ref.replace(/^\//, ''))
  if (existsSync(localPath)) return copyAndTrack(localPath)

  console.log(`  UNRESOLVED: ${ref}`)
  return null
}

// -------------------------------------------------------------------
// 1. Migrate Atelier images
// -------------------------------------------------------------------
console.log('Migrating ateliers...')
const ateliers = db.prepare('SELECT * FROM content_ateliers').all() as any[]
let ateliersUpdated = 0

for (const atelier of ateliers) {
  let changed = false
  let newMainImage = atelier.mainImage
  let newCardImage = atelier.cardImage
  let newImages = atelier.images ? JSON.parse(atelier.images) : null

  if (atelier.mainImage && !atelier.mainImage.startsWith('/images/')) {
    const resolved = resolveImageRef(atelier.mainImage)
    if (resolved) { newMainImage = resolved; changed = true }
  }

  if (atelier.cardImage && !atelier.cardImage.startsWith('/images/')) {
    const resolved = resolveImageRef(atelier.cardImage)
    if (resolved) { newCardImage = resolved; changed = true }
  }

  if (Array.isArray(newImages) && newImages.length > 0) {
    const resolvedImages: string[] = []
    let imagesChanged = false
    for (const imgRef of newImages) {
      if (imgRef.startsWith('/images/')) {
        resolvedImages.push(imgRef)
      } else {
        const resolved = resolveImageRef(imgRef)
        if (resolved) { resolvedImages.push(resolved); imagesChanged = true }
      }
    }
    if (imagesChanged) { newImages = resolvedImages; changed = true }
  }

  if (changed) {
    db.prepare('UPDATE content_ateliers SET mainImage = ?, cardImage = ?, images = ?, updatedAt = ? WHERE id = ?')
      .run(newMainImage, newCardImage, newImages ? JSON.stringify(newImages) : null, Date.now(), atelier.id)
    ateliersUpdated++
  }
}
console.log(`  Updated ${ateliersUpdated} ateliers`)

// -------------------------------------------------------------------
// 2. Migrate Person images
// -------------------------------------------------------------------
console.log('Migrating persons...')
const persons = db.prepare('SELECT * FROM content_persons').all() as any[]
let personsUpdated = 0

for (const person of persons) {
  if (person.image && !person.image.startsWith('/images/')) {
    const resolved = resolveImageRef(person.image)
    if (resolved) {
      db.prepare('UPDATE content_persons SET image = ?, updatedAt = ? WHERE id = ?')
        .run(resolved, Date.now(), person.id)
      personsUpdated++
    }
  }
}
console.log(`  Updated ${personsUpdated} persons`)

// -------------------------------------------------------------------
// 3. Migrate News images
// -------------------------------------------------------------------
console.log('Migrating news...')
const news = db.prepare('SELECT * FROM content_news').all() as any[]
let newsUpdated = 0

for (const item of news) {
  if (item.image && !item.image.startsWith('/images/')) {
    const resolved = resolveImageRef(item.image)
    if (resolved) {
      db.prepare('UPDATE content_news SET image = ?, updatedAt = ? WHERE id = ?')
        .run(resolved, Date.now(), item.id)
      newsUpdated++
    }
  }
}
console.log(`  Updated ${newsUpdated} news items`)

// -------------------------------------------------------------------
// 4. Migrate Category thumbnails and backgrounds
// -------------------------------------------------------------------
console.log('Migrating categories...')
const categories = db.prepare('SELECT * FROM content_categories').all() as any[]
let categoriesUpdated = 0

for (const cat of categories) {
  let changed = false
  let newThumb = cat.thumbnail
  let newBg = cat.background

  if (cat.thumbnail && !cat.thumbnail.startsWith('/images/')) {
    const resolved = resolveImageRef(cat.thumbnail)
    if (resolved) { newThumb = resolved; changed = true }
  }
  if (cat.background && !cat.background.startsWith('/images/')) {
    const resolved = resolveImageRef(cat.background)
    if (resolved) { newBg = resolved; changed = true }
  }

  if (changed) {
    db.prepare('UPDATE content_categories SET thumbnail = ?, background = ?, updatedAt = ? WHERE id = ?')
      .run(newThumb, newBg, Date.now(), cat.id)
    categoriesUpdated++
  }
}
console.log(`  Updated ${categoriesUpdated} categories`)

// -------------------------------------------------------------------
// Summary
// -------------------------------------------------------------------
db.close()

console.log(`
Done!
  ${uploaded} images copied to .data/blob/sintlukas/
  ${failed} failed/not found
  ${ateliersUpdated} ateliers updated
  ${personsUpdated} persons updated
  ${newsUpdated} news items updated
  ${categoriesUpdated} categories updated

Restart the dev server to see the changes.
`)
