/**
 * @crouton-studio
 * App scanner utility - discovers collections, components, and pages in the host app
 */

import { readFile, readdir, stat, access } from 'node:fs/promises'
import { join, basename, relative } from 'node:path'
import type { AppContext, CollectionInfo, ComponentInfo, PageInfo, LayerInfo, FieldInfo } from '../../app/types/studio'

/**
 * Check if a path exists
 */
async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  }
  catch {
    return false
  }
}

/**
 * Read and parse nuxt.config.ts to extract extends array
 */
async function parseNuxtConfig(appRoot: string): Promise<string[]> {
  const configPath = join(appRoot, 'nuxt.config.ts')

  if (!(await pathExists(configPath))) {
    return []
  }

  try {
    const content = await readFile(configPath, 'utf-8')

    // Extract extends array using regex (simple parsing)
    // Matches: extends: ['...', '...'] or extends: ["...", "..."]
    const extendsMatch = content.match(/extends\s*:\s*\[([^\]]+)\]/s)
    if (!extendsMatch) return []

    // Extract all string values from the array
    const extendsContent = extendsMatch[1]
    const stringMatches = extendsContent.match(/['"]([^'"]+)['"]/g) || []

    return stringMatches.map(s => s.replace(/['"]/g, ''))
  }
  catch (error) {
    console.error('Error parsing nuxt.config.ts:', error)
    return []
  }
}

/**
 * Parse a layer configuration to get layer info
 */
function parseLayerPath(extendPath: string, appRoot: string): LayerInfo {
  const isLocal = extendPath.startsWith('./')
  const isCroutonPackage = extendPath.startsWith('@fyit/crouton')

  let path: string
  let name: string

  if (isLocal) {
    path = join(appRoot, extendPath)
    name = basename(extendPath)
  }
  else {
    // For packages, we'd need to resolve through node_modules
    // For now, just use the package name
    path = extendPath
    name = extendPath
  }

  return {
    name,
    path,
    isLocal,
    isCroutonPackage
  }
}

/**
 * Scan a single layer for collections
 */
async function scanLayerCollections(layerPath: string, layerName: string): Promise<CollectionInfo[]> {
  const collectionsDir = join(layerPath, 'collections')

  if (!(await pathExists(collectionsDir))) {
    return []
  }

  try {
    const entries = await readdir(collectionsDir, { withFileTypes: true })
    const collections: CollectionInfo[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const collectionPath = join(collectionsDir, entry.name)
      const collection = await parseCollectionInfo(collectionPath, entry.name, layerName)
      if (collection) {
        collections.push(collection)
      }
    }

    return collections
  }
  catch (error) {
    console.error(`Error scanning layer ${layerName} collections:`, error)
    return []
  }
}

/**
 * Parse collection information from its directory
 */
async function parseCollectionInfo(
  collectionPath: string,
  collectionName: string,
  layerName: string
): Promise<CollectionInfo | null> {
  // Check if this looks like a collection (has nuxt.config.ts or types.ts)
  const hasNuxtConfig = await pathExists(join(collectionPath, 'nuxt.config.ts'))
  const hasTypes = await pathExists(join(collectionPath, 'types.ts'))

  if (!hasNuxtConfig && !hasTypes) {
    return null
  }

  // Parse fields from types.ts
  const fields = await parseFieldsFromTypes(collectionPath)

  // Discover components
  const components = await discoverCollectionComponents(collectionPath)

  // Discover composables
  const composables = await discoverCollectionComposables(collectionPath)

  // Discover API endpoints
  const apiEndpoints = await discoverApiEndpoints(collectionPath)

  return {
    name: collectionName,
    layer: layerName,
    path: collectionPath,
    fields,
    components,
    composables,
    apiEndpoints
  }
}

/**
 * Parse fields from types.ts file
 */
async function parseFieldsFromTypes(collectionPath: string): Promise<FieldInfo[]> {
  const typesPath = join(collectionPath, 'types.ts')

  if (!(await pathExists(typesPath))) {
    return []
  }

  try {
    const content = await readFile(typesPath, 'utf-8')

    // Extract interface definition
    // Looking for: export interface {Name} { ... }
    const interfaceMatch = content.match(/export\s+interface\s+\w+\s*\{([^}]+)\}/s)
    if (!interfaceMatch) return []

    const interfaceBody = interfaceMatch[1]
    const fields: FieldInfo[] = []

    // Auto-generated field names
    const autoFields = ['id', 'teamId', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'optimisticId', 'optimisticAction']

    // Parse each line for field definitions
    const lines = interfaceBody.split('\n')
    for (const line of lines) {
      // Match: fieldName: Type or fieldName?: Type
      const fieldMatch = line.match(/^\s*(\w+)(\?)?:\s*([^\n]+)/)
      if (fieldMatch) {
        const [, name, optional, type] = fieldMatch
        fields.push({
          name,
          type: type.trim().replace(/\s*\/\/.*$/, ''), // Remove inline comments
          required: !optional,
          auto: autoFields.includes(name)
        })
      }
    }

    return fields
  }
  catch (error) {
    console.error(`Error parsing types from ${collectionPath}:`, error)
    return []
  }
}

/**
 * Discover components in a collection
 */
async function discoverCollectionComponents(collectionPath: string): Promise<string[]> {
  const componentsDir = join(collectionPath, 'app', 'components')

  if (!(await pathExists(componentsDir))) {
    return []
  }

  try {
    const entries = await readdir(componentsDir)
    return entries.filter(f => f.endsWith('.vue'))
  }
  catch {
    return []
  }
}

/**
 * Discover composables in a collection
 */
async function discoverCollectionComposables(collectionPath: string): Promise<string[]> {
  const composablesDir = join(collectionPath, 'app', 'composables')

  if (!(await pathExists(composablesDir))) {
    return []
  }

  try {
    const entries = await readdir(composablesDir)
    return entries.filter(f => f.endsWith('.ts') && f.startsWith('use'))
  }
  catch {
    return []
  }
}

/**
 * Discover API endpoints in a collection
 */
async function discoverApiEndpoints(collectionPath: string): Promise<string[]> {
  const apiDir = join(collectionPath, 'server', 'api')

  if (!(await pathExists(apiDir))) {
    return []
  }

  const endpoints: string[] = []

  async function walkDir(dir: string, basePath: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      const relativePath = join(basePath, entry.name)

      if (entry.isDirectory()) {
        await walkDir(fullPath, relativePath)
      }
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
        endpoints.push(relativePath)
      }
    }
  }

  try {
    await walkDir(apiDir, '')
    return endpoints
  }
  catch {
    return []
  }
}

/**
 * Scan app/components/ for components
 */
async function scanAppComponents(appRoot: string): Promise<ComponentInfo[]> {
  const componentsDir = join(appRoot, 'app', 'components')

  if (!(await pathExists(componentsDir))) {
    return []
  }

  const components: ComponentInfo[] = []

  async function walkDir(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        await walkDir(fullPath)
      }
      else if (entry.name.endsWith('.vue')) {
        const name = entry.name.replace('.vue', '')
        components.push({
          name,
          path: fullPath,
          relativePath: relative(appRoot, fullPath)
        })
      }
    }
  }

  try {
    await walkDir(componentsDir)
    return components
  }
  catch (error) {
    console.error('Error scanning app components:', error)
    return []
  }
}

/**
 * Scan app/pages/ for pages
 */
async function scanAppPages(appRoot: string): Promise<PageInfo[]> {
  const pagesDir = join(appRoot, 'app', 'pages')

  if (!(await pathExists(pagesDir))) {
    return []
  }

  const pages: PageInfo[] = []

  async function walkDir(dir: string, routePath: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        // Handle dynamic routes like [id]
        const routeSegment = entry.name.startsWith('[')
          ? `:${entry.name.slice(1, -1)}`
          : entry.name

        await walkDir(fullPath, `${routePath}/${routeSegment}`)
      }
      else if (entry.name.endsWith('.vue')) {
        // Convert filename to route
        let name = entry.name.replace('.vue', '')
        let route = routePath

        if (name === 'index') {
          // index.vue -> /path
          route = routePath || '/'
        }
        else if (name.startsWith('[') && name.endsWith(']')) {
          // [id].vue -> /path/:id
          route = `${routePath}/:${name.slice(1, -1)}`
        }
        else {
          route = `${routePath}/${name}`
        }

        pages.push({
          name: name === 'index' ? basename(routePath) || 'Home' : name,
          route,
          path: fullPath
        })
      }
    }
  }

  try {
    await walkDir(pagesDir, '')
    return pages
  }
  catch (error) {
    console.error('Error scanning app pages:', error)
    return []
  }
}

/**
 * Main scanner function - scans the entire host app
 */
export async function scanApp(appRoot: string): Promise<AppContext> {
  // 1. Parse nuxt.config.ts for extends
  const extendsPaths = await parseNuxtConfig(appRoot)

  // 2. Build layer info
  const layers: LayerInfo[] = extendsPaths.map(p => parseLayerPath(p, appRoot))

  // 3. Scan local layers for collections
  const collections: CollectionInfo[] = []
  for (const layer of layers) {
    if (layer.isLocal) {
      const layerCollections = await scanLayerCollections(layer.path, layer.name)
      collections.push(...layerCollections)
    }
  }

  // 4. Scan app components
  const components = await scanAppComponents(appRoot)

  // 5. Scan app pages
  const pages = await scanAppPages(appRoot)

  return {
    appRoot,
    layers,
    collections,
    components,
    pages,
    scannedAt: new Date()
  }
}
