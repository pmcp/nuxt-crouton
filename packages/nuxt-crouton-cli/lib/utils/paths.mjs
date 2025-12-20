// Path configuration for scaffolder
// Provides a centralized, configurable way to manage import paths in generated code

export const PATH_CONFIG = {
  // Define path patterns as variables
  // These use Nuxt's layer alias system (#layers/layer-name/...)
  patterns: {
    // For files in collection's server/api/teams/[id]/X/
    // These need to import from database/queries and database/schema
    fromApiToQueries: '#layers/{layerName}-{collectionName}/server/database/queries',
    fromApiToSchema: '#layers/{layerName}-{collectionName}/server/database/schema',
    fromApiToTypes: '#layers/{layerName}-{collectionName}/types',

    // For files in collection's app/components/
    // These need to import types and composables
    fromComponentToTypes: '#layers/{layerName}-{collectionName}/types',
    fromComponentToComposables: '#layers/{layerName}-{collectionName}/app/composables/{composableName}',

    // For files in collection's root (types.ts)
    // These need to import from composables for schema types
    fromTypesToComposable: '#layers/{layerName}-{collectionName}/app/composables/{composableName}',

    // For files in server/database/ (queries.ts)
    // These need to import types
    fromQueriesToTypes: '#layers/{layerName}-{collectionName}/types',

    // Fallback patterns using relative paths (if layer naming isn't available)
    fallback: {
      fromApiToQueries: '../../../../database/queries',
      fromApiToSchema: '../../../../database/schema',
      fromApiToTypes: '../../../../../../types',
      fromComponentToTypes: '../../types',
      fromQueriesToTypes: '../types'
    }
  },

  // Function to resolve paths with variables
  resolve(pattern, variables = {}) {
    return pattern.replace(/\{(\w+)\}/g, (match, key) => {
      const value = variables[key]
      if (value === undefined) {
        console.warn(`Warning: Variable ${key} not provided for path pattern`)
        return match
      }
      return value
    })
  },

  // Helper to get the appropriate path based on whether layer naming is enabled
  getImportPath(pathKey, variables = {}, useLayerAliases = true) {
    const patterns = useLayerAliases ? this.patterns : this.patterns.fallback
    const pattern = patterns[pathKey]

    if (!pattern) {
      console.error(`Unknown path key: ${pathKey}`)
      return this.patterns.fallback[pathKey] || ''
    }

    // For fallback patterns, no variable substitution needed
    if (!useLayerAliases) {
      return pattern
    }

    return this.resolve(pattern, variables)
  },

  // Generate the layer-collection name combo for nuxt.config $meta
  getLayerName(layerName, collectionName) {
    return `${layerName}-${collectionName}`
  }
}

// Export a convenience function for common use
export function getImportPath(pathKey, variables = {}, useLayerAliases = true) {
  return PATH_CONFIG.getImportPath(pathKey, variables, useLayerAliases)
}
