export default function () {
  // Known layer prefixes - add more as needed
  const layerPrefixes = ['shop', 'yassss', 'thisone', 'test']

  // Strip layer prefix from collection name
  const stripLayerPrefix = (val: string): string => {
    // Find and remove layer prefix
    for (const prefix of layerPrefixes) {
      if (val.toLowerCase().startsWith(prefix.toLowerCase())) {
        // Remove prefix and return the rest
        const withoutPrefix = val.slice(prefix.length)
        // Ensure first character is lowercase for proper camelCase
        return withoutPrefix.charAt(0).toLowerCase() + withoutPrefix.slice(1)
      }
    }
    return val
  }

  // Convert camelCase to Title Case with spaces
  const camelToTitleCase = (val: string): string => {
    // Insert space before capital letters and capitalize first letter
    const result = val.replace(/([A-Z])/g, ' $1').trim()
    return result.charAt(0).toUpperCase() + result.slice(1)
  }

  const collectionWithCapital = (val: string): string => {
    const stripped = stripLayerPrefix(val)
    return camelToTitleCase(stripped)
  }

  const collectionWithCapitalSingular = (val: string): string => {
    const stripped = stripLayerPrefix(val)
    // Remove trailing 's' for singular (simple pluralization)
    const singular = stripped.endsWith('es')
      ? stripped.slice(0, -2)
      : stripped.endsWith('s')
        ? stripped.slice(0, -1)
        : stripped
    return camelToTitleCase(singular)
  }

  return {
    collectionWithCapital,
    collectionWithCapitalSingular,
    stripLayerPrefix,
    camelToTitleCase
  }
}
