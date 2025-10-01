export function useFormatCollections() {
  // Get layer prefixes from croutonCollections registry
  const appConfig = useAppConfig()
  const collections = appConfig.croutonCollections || {}

  // Extract unique layer values from all collection configs
  const layerPrefixes = Object.values(collections)
    .map((config: any) => config?.layer)
    .filter((layer): layer is string => typeof layer === 'string')
    .filter((layer, index, arr) => arr.indexOf(layer) === index) // unique

  // Strip layer prefix from collection name
  const stripLayerPrefix = (val: string): string => {
    if (!val) return ''

    // Find and remove layer prefix
    for (const prefix of layerPrefixes) {
      if (val.toLowerCase().startsWith(prefix.toLowerCase())) {
        const withoutPrefix = val.slice(prefix.length)
        return withoutPrefix.charAt(0).toLowerCase() + withoutPrefix.slice(1)
      }
    }
    return val
  }

  // Convert camelCase to Title Case with spaces
  const camelToTitleCase = (val: string): string => {
    const result = val.replace(/([A-Z])/g, ' $1').trim()
    return result.charAt(0).toUpperCase() + result.slice(1)
  }

  const collectionWithCapital = (val: string): string => {
    if (!val) return ''
    const stripped = stripLayerPrefix(val)
    return camelToTitleCase(stripped)
  }

  const collectionWithCapitalSingular = (val: string): string => {
    if (!val) return ''
    const stripped = stripLayerPrefix(val)

    // Proper singularization rules
    let singular = stripped

    // Handle -ies → -y (e.g., "categories" → "category")
    if (stripped.endsWith('ies') && stripped.length > 3) {
      singular = stripped.slice(0, -3) + 'y'
    }
    // Handle -es after sibilants: x, ch, sh, s, z (e.g., "boxes" → "box", "watches" → "watch")
    else if (stripped.endsWith('xes') || stripped.endsWith('ches') ||
             stripped.endsWith('shes') || stripped.endsWith('sses') ||
             stripped.endsWith('zes')) {
      singular = stripped.slice(0, -2)
    }
    // Handle -oes → -o (e.g., "heroes" → "hero", "tomatoes" → "tomato")
    else if (stripped.endsWith('oes') && stripped.length > 3) {
      const beforeOes = stripped.slice(0, -3)
      // Check if the character before "oes" is a vowel
      const lastChar = beforeOes[beforeOes.length - 1]
      if (lastChar && 'aeiou'.includes(lastChar.toLowerCase())) {
        singular = stripped.slice(0, -2)
      } else {
        // Consonant + oes, just remove 's' (e.g., "echoes" → "echo")
        singular = stripped.slice(0, -1)
      }
    }
    // Default: just remove trailing 's' (e.g., "articles" → "article", "users" → "user")
    else if (stripped.endsWith('s') && stripped.length > 1) {
      singular = stripped.slice(0, -1)
    }

    return camelToTitleCase(singular)
  }

  // Convert camelCase to PascalCase
  const toPascalCase = (val: string): string => {
    if (!val) return ''
    return val.charAt(0).toUpperCase() + val.slice(1)
  }

  return {
    collectionWithCapital,
    collectionWithCapitalSingular,
    stripLayerPrefix,
    camelToTitleCase,
    toPascalCase
  }
}

export default useFormatCollections