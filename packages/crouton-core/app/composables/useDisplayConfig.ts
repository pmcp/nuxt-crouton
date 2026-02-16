/**
 * Resolves display config for a collection, merging explicit config with auto-inferred defaults.
 *
 * Display config maps roles (title, subtitle, image, badge, description) to field names.
 * When explicit config is missing for a role, heuristics infer it from field names and types.
 *
 * @example
 * const display = useDisplayConfig('shopProducts')
 * // { title: 'name', image: 'photo', badge: 'status', subtitle: 'brand', description: 'summary' }
 */
export default function useDisplayConfig(collectionName: string) {
  const { getConfig } = useCollections()
  const config = getConfig(collectionName)

  const explicit = config?.display ?? {}
  const fields = config?.fields ?? []

  // Track which fields are already claimed by explicit config
  const claimed = new Set(Object.values(explicit).filter(Boolean))

  const inferred: Record<string, string | undefined> = {}

  // Title: field named title/name/label, or first string field
  if (!explicit.title) {
    inferred.title = findFieldByNames(fields, ['title', 'name', 'label'])
      ?? firstFieldOfType(fields, ['string'])
  }

  // Mark title as claimed so subtitle doesn't duplicate it
  const titleField = explicit.title ?? inferred.title
  if (titleField) claimed.add(titleField)

  // Subtitle: field named subtitle/description/summary (not already used as title)
  if (!explicit.subtitle) {
    inferred.subtitle = findFieldByNames(fields, ['subtitle', 'description', 'summary'], claimed)
  }

  const subtitleField = explicit.subtitle ?? inferred.subtitle
  if (subtitleField) claimed.add(subtitleField)

  // Image: first field of type image or asset
  if (!explicit.image) {
    inferred.image = firstFieldOfType(fields, ['image', 'asset'], claimed)
  }

  // Badge: field named status/state/category, or first field with displayAs badge
  if (!explicit.badge) {
    inferred.badge = findFieldByNames(fields, ['status', 'state', 'category'], claimed)
      ?? firstFieldWithDisplayAs(fields, 'badge', claimed)
  }

  // Description: field named description/summary/excerpt (not already used)
  if (!explicit.description) {
    inferred.description = findFieldByNames(fields, ['description', 'summary', 'excerpt'], claimed)
  }

  // Explicit overrides inferred
  return { ...stripUndefined(inferred), ...stripUndefined(explicit) }
}

// --- Helper functions ---

interface FieldEntry {
  name: string
  type: string
  label: string
  area?: string
  displayAs?: string
}

/** Find first field matching one of the candidate names (in order) */
function findFieldByNames(
  fields: FieldEntry[],
  candidates: string[],
  exclude?: Set<string>
): string | undefined {
  for (const candidate of candidates) {
    const field = fields.find(f => f.name === candidate && !exclude?.has(f.name))
    if (field) return field.name
  }
  return undefined
}

/** Find first field matching one of the given types */
function firstFieldOfType(
  fields: FieldEntry[],
  types: string[],
  exclude?: Set<string>
): string | undefined {
  const field = fields.find(f => types.includes(f.type) && !exclude?.has(f.name))
  return field?.name
}

/** Find first field with a specific displayAs value */
function firstFieldWithDisplayAs(
  fields: FieldEntry[],
  displayAs: string,
  exclude?: Set<string>
): string | undefined {
  const field = fields.find(f => f.displayAs === displayAs && !exclude?.has(f.name))
  return field?.name
}

/** Remove undefined values from an object */
function stripUndefined(obj: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) result[key] = value
  }
  return result
}
