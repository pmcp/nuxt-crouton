// module-detector.mjs - Detect and validate required Nuxt modules
import fsp from 'node:fs/promises'
import path from 'node:path'

/**
 * Check if a package/layer is installed in package.json
 * Handles both npm package names and local file: paths
 */
async function isPackageInstalled(packageName) {
  try {
    const packageJsonPath = path.resolve('package.json')
    const packageJson = JSON.parse(await fsp.readFile(packageJsonPath, 'utf-8'))

    const deps = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {}
    }

    // Direct match for npm package name
    if (packageName in deps) {
      return true
    }

    // Check for local file: paths that reference the package
    // e.g., "file:/path/to/nuxt-crouton" for "@friendlyinternet/nuxt-crouton"
    const packageShortName = packageName.replace('@friendlyinternet/', '')
    for (const [name, version] of Object.entries(deps)) {
      // Check if the dependency value is a file: path containing the package name
      if (typeof version === 'string' && version.startsWith('file:')) {
        if (version.endsWith(`/${packageShortName}`) || version.includes(`/${packageShortName}/`)) {
          return true
        }
      }
      // Also check if the dep name itself matches the short name with file: value
      if (name === packageName && typeof version === 'string') {
        return true
      }
    }

    return false
  } catch (e) {
    console.warn(`Warning: Could not read package.json: ${e.message}`)
    return false
  }
}

/**
 * Check if a layer is extended in nuxt.config
 * Handles both npm package names and local file paths
 */
async function isLayerExtended(layerName) {
  try {
    const nuxtConfigPath = path.resolve('nuxt.config.ts')
    const nuxtConfig = await fsp.readFile(nuxtConfigPath, 'utf-8')

    // Check if layer is in extends array
    const extendsMatch = nuxtConfig.match(/extends:\s*\[([\s\S]*?)\]/)
    if (extendsMatch) {
      const extendsContent = extendsMatch[1]

      // Direct match for npm package name
      if (extendsContent.includes(layerName)) {
        return true
      }

      // Check for local path match (e.g., /path/to/nuxt-crouton or /path/to/nuxt-crouton-auth)
      // Extract the package short name from @friendlyinternet/nuxt-crouton-auth -> nuxt-crouton-auth
      const packageShortName = layerName.replace('@friendlyinternet/', '')
      // Match paths ending with the package name (with possible trailing quote/comma)
      const localPathRegex = new RegExp(`[/\\\\]${packageShortName}['"\`\\s,\\]]`)
      if (localPathRegex.test(extendsContent)) {
        return true
      }
    }
    return false
  } catch (e) {
    console.warn(`Warning: Could not read nuxt.config.ts: ${e.message}`)
    return false
  }
}

/**
 * Check if a layer exists in the project
 */
async function layerExists(layerName) {
  try {
    const layerPath = path.resolve('layers', layerName)
    const stats = await fsp.stat(layerPath)
    return stats.isDirectory()
  } catch {
    return false
  }
}

/**
 * Check if any field uses a specific component
 */
function hasFieldWithComponent(config, componentName) {
  if (!config?.collections) return false

  for (const collection of config.collections) {
    if (collection.fieldsFile) {
      // Will need to check the actual field file
      // For now, return false - detection happens at generation time
      continue
    }
    if (collection.fields) {
      for (const field of Object.values(collection.fields)) {
        if (field.meta?.component === componentName) {
          return true
        }
      }
    }
  }
  return false
}

/**
 * Detect required layers for a collection configuration
 */
export async function detectRequiredDependencies(config) {
  const required = {
    layers: [],
    missing: []
  }

  // Always check for base Crouton layer first
  const baseLayerInstalled = await isPackageInstalled('@friendlyinternet/nuxt-crouton')
  const baseLayerExtended = await isLayerExtended('@friendlyinternet/nuxt-crouton')

  // Check base layer status first
  if (baseLayerInstalled && !baseLayerExtended) {
    // Package installed but not added to nuxt.config.ts extends[]
    required.missing.push({
      type: 'layer',
      name: '@friendlyinternet/nuxt-crouton',
      reason: 'Package is installed but NOT added to nuxt.config.ts extends[]',
      installCmd: '(already installed)',
      configCmd: `Add to nuxt.config.ts:\n\n   extends: ['@friendlyinternet/nuxt-crouton']`,
      critical: true,
      note: 'Auth, admin, and i18n are automatically included when using the core package.'
    })
  } else if (!baseLayerInstalled) {
    // Fallback to check for local crouton layer
    const croutonLayerExists = await layerExists('crouton')
    if (!croutonLayerExists) {
      // Core not installed - check if standalone auth is available
      const authPackageInstalled = await isPackageInstalled('@friendlyinternet/nuxt-crouton-auth')
      const authLayerExtended = await isLayerExtended('@friendlyinternet/nuxt-crouton-auth')

      if (!authPackageInstalled && !authLayerExtended) {
        // Neither core nor auth available - recommend installing core (which includes auth)
        required.missing.push({
          type: 'package',
          name: '@friendlyinternet/nuxt-crouton',
          reason: 'Required for Crouton collections (includes auth, admin, and i18n)',
          installCmd: 'pnpm add @friendlyinternet/nuxt-crouton',
          configCmd: `Add to nuxt.config.ts:\n\n   extends: ['@friendlyinternet/nuxt-crouton']`,
          critical: true
        })
      } else if (authPackageInstalled && !authLayerExtended) {
        // Standalone auth installed but not extended - this is a legacy setup
        required.missing.push({
          type: 'layer',
          name: '@friendlyinternet/nuxt-crouton-auth',
          reason: 'Package is installed but NOT added to nuxt.config.ts extends[]',
          installCmd: '(already installed)',
          configCmd: `Add to nuxt.config.ts:\n\n   extends: ['@friendlyinternet/nuxt-crouton-auth']`,
          critical: true,
          note: 'Consider using @friendlyinternet/nuxt-crouton instead (includes auth + admin + i18n).'
        })
      }
      // If auth is extended standalone, that's fine too
    } else {
      required.layers.push('crouton')
    }
  } else {
    // Core is installed AND extended - auth is bundled, no separate check needed
    required.layers.push('@friendlyinternet/nuxt-crouton')
  }

  // Check if translations are needed
  const hasTranslations = config?.translations?.collections
    && Object.keys(config.translations.collections).length > 0

  if (hasTranslations && !config.noTranslations) {
    // Check for nuxt-crouton-i18n layer (addon)
    const layerInstalled = await isPackageInstalled('@friendlyinternet/nuxt-crouton-i18n')
    const layerExtended = await isLayerExtended('@friendlyinternet/nuxt-crouton-i18n')

    if (layerInstalled && layerExtended) {
      required.layers.push('@friendlyinternet/nuxt-crouton-i18n')
    } else {
      // Fallback to check for local translations layer
      const translationsLayerExists = await layerExists('translations')
      if (translationsLayerExists) {
        required.layers.push('translations')
      } else {
        required.missing.push({
          type: 'layer',
          name: '@friendlyinternet/nuxt-crouton-i18n',
          reason: 'Required addon for translation fields',
          installCmd: 'pnpm add @friendlyinternet/nuxt-crouton-i18n',
          configCmd: `Add BOTH '@friendlyinternet/nuxt-crouton' and '@friendlyinternet/nuxt-crouton-i18n' to extends array`
        })
      }
    }
  }

  // Check if rich text editor is needed (CroutonEditorSimple component)
  const hasEditorFields = hasFieldWithComponent(config, 'CroutonEditorSimple')

  if (hasEditorFields) {
    const editorInstalled = await isPackageInstalled('@friendlyinternet/nuxt-crouton-editor')
    const editorExtended = await isLayerExtended('@friendlyinternet/nuxt-crouton-editor')

    if (editorInstalled && editorExtended) {
      required.layers.push('@friendlyinternet/nuxt-crouton-editor')
    } else {
      required.missing.push({
        type: 'layer',
        name: '@friendlyinternet/nuxt-crouton-editor',
        reason: 'Required addon for CroutonEditorSimple rich text editor',
        installCmd: 'pnpm add @friendlyinternet/nuxt-crouton-editor',
        configCmd: `Add '@friendlyinternet/nuxt-crouton-editor' to extends array`
      })
    }
  }

  // Check if maps package is needed (useMaps flag enabled)
  const useMaps = config?.flags?.useMaps === true

  if (useMaps) {
    const mapsInstalled = await isPackageInstalled('@friendlyinternet/nuxt-crouton-maps')
    const mapsExtended = await isLayerExtended('@friendlyinternet/nuxt-crouton-maps')

    if (mapsInstalled && mapsExtended) {
      required.layers.push('@friendlyinternet/nuxt-crouton-maps')
    } else {
      required.missing.push({
        type: 'layer',
        name: '@friendlyinternet/nuxt-crouton-maps',
        reason: 'Required addon for map display and geocoding features (useMaps: true)',
        installCmd: 'pnpm add @friendlyinternet/nuxt-crouton-maps',
        configCmd: `Add '@friendlyinternet/nuxt-crouton-maps' to extends array`
      })
    }
  }

  return required
}

/**
 * Display missing dependencies and instructions
 */
export function displayMissingDependencies(dependencies) {
  if (dependencies.missing.length === 0) return true

  const hasCritical = dependencies.missing.some(d => d.critical)

  if (hasCritical) {
    console.log('\n🚨 CRITICAL: Missing Required Dependencies\n')
  } else {
    console.log('\n❌ Missing Required Dependencies\n')
  }

  console.log('The following layers are required for your collection:')
  console.log('═'.repeat(60))

  dependencies.missing.forEach((dep) => {
    const prefix = dep.critical ? '🚨' : '📦'
    console.log(`\n${prefix} ${dep.name}${dep.critical ? ' [CRITICAL]' : ''}`)
    console.log(`   Reason: ${dep.reason}`)
    console.log(`\n   Installation steps:`)
    console.log(`   1. Install: ${dep.installCmd}`)
    console.log(`   2. Configure: ${dep.configCmd}`)
    if (dep.note) {
      console.log(`\n   ℹ️  ${dep.note}`)
    }
  })

  console.log('\n═'.repeat(60))

  // Get packages that need installation (not already installed)
  const toInstall = dependencies.missing
    .filter(d => !d.installCmd.includes('already installed'))
    .map(d => d.installCmd.replace('pnpm add ', ''))
    .filter(Boolean)

  if (toInstall.length > 0) {
    console.log('\n💡 Quick install:')
    console.log(`   pnpm add ${toInstall.join(' ')}`)
  }

  // Check if core package is being added (which includes auth/admin/i18n)
  const hasCoreMissing = dependencies.missing.some(d => d.name === '@friendlyinternet/nuxt-crouton')

  console.log('\nThen add to nuxt.config.ts:')
  console.log(`   extends: [`)

  if (hasCoreMissing) {
    // Core includes auth, admin, and i18n - only show core
    console.log(`     '@friendlyinternet/nuxt-crouton',  // Includes auth, admin, i18n`)
    // Show other addon layers (not auth/admin/i18n since they're bundled)
    dependencies.missing.forEach((dep) => {
      const bundledPackages = [
        '@friendlyinternet/nuxt-crouton',
        '@friendlyinternet/nuxt-crouton-auth',
        '@friendlyinternet/nuxt-crouton-admin',
        '@friendlyinternet/nuxt-crouton-i18n'
      ]
      if (!bundledPackages.includes(dep.name)) {
        console.log(`     '${dep.name}',  // Addon layer`)
      }
    })
  } else {
    // No core - show all missing layers
    dependencies.missing.forEach((dep) => {
      console.log(`     '${dep.name}',`)
    })
  }

  console.log(`     // ... your layers`)
  console.log(`   ]`)

  console.log('\n')
  return false
}

/**
 * Check if a layer name is an npm package (vs local layer)
 */
function isNpmPackage(layerName) {
  // Package names start with @ (scoped) or don't contain ./ prefix
  return layerName.startsWith('@') || (!layerName.startsWith('./') && !layerName.startsWith('../'))
}

/**
 * Ensure nuxt.config extends required layers
 */
export async function ensureLayersExtended(layers) {
  if (layers.length === 0) return

  try {
    const nuxtConfigPath = path.resolve('nuxt.config.ts')
    let content = await fsp.readFile(nuxtConfigPath, 'utf-8')

    // Check if extends exists
    if (!content.includes('extends:')) {
      // Add extends array
      const moduleIndex = content.indexOf('modules:')
      if (moduleIndex !== -1) {
        const insertPoint = content.lastIndexOf('}', moduleIndex)
        const layerPaths = layers.map((l) => {
          const layerPath = isNpmPackage(l) ? l : `./layers/${l}`
          return `    '${layerPath}'`
        }).join(',\n')
        const extendsBlock = `\n  extends: [\n${layerPaths}\n  ],\n`
        content = content.slice(0, insertPoint) + extendsBlock + content.slice(insertPoint)
      }
    } else {
      // Check each layer is extended
      for (const layer of layers) {
        // Determine the correct path format
        const layerPath = isNpmPackage(layer) ? `'${layer}'` : `'./layers/${layer}'`

        // For npm packages, check if already extended (in any format including local paths)
        if (isNpmPackage(layer)) {
          // Direct match for npm package name
          if (content.includes(`'${layer}'`)) {
            continue // Already extended
          }

          // Check for local path match (e.g., /path/to/nuxt-crouton or /path/to/nuxt-crouton-auth)
          const packageShortName = layer.replace('@friendlyinternet/', '')
          const localPathRegex = new RegExp(`[/\\\\]${packageShortName}['"\`\\s,\\]]`)
          if (localPathRegex.test(content)) {
            continue // Already extended via local path
          }
        }

        if (!content.includes(layerPath)) {
          // Add to extends array
          const extendsMatch = content.match(/extends:\s*\[([^\]]*)\]/)
          if (extendsMatch) {
            const currentExtends = extendsMatch[1]
            const newExtends = currentExtends.trim()
              ? `${currentExtends},\n    ${layerPath}`
              : `\n    ${layerPath}\n  `
            content = content.replace(
              /extends:\s*\[([^\]]*)\]/,
              `extends: [${newExtends}]`
            )
          }
        }
      }
    }

    await fsp.writeFile(nuxtConfigPath, content, 'utf-8')
    console.log(`✓ Updated nuxt.config.ts to extend required layers`)
  } catch (e) {
    console.warn(`⚠️  Could not update nuxt.config.ts: ${e.message}`)
    console.log(`   Please manually add to extends array:`)
    layers.forEach((layer) => {
      const layerPath = isNpmPackage(layer) ? layer : `./layers/${layer}`
      console.log(`     '${layerPath}'`)
    })
  }
}
