// module-detector.mjs - Detect and validate required Nuxt modules
import fsp from 'fs/promises'
import path from 'path'

/**
 * Check if a package/layer is installed in package.json
 */
async function isPackageInstalled(packageName) {
  try {
    const packageJsonPath = path.resolve('package.json')
    const packageJson = JSON.parse(await fsp.readFile(packageJsonPath, 'utf-8'))

    const deps = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {}
    }

    return packageName in deps
  } catch (e) {
    console.warn(`Warning: Could not read package.json: ${e.message}`)
    return false
  }
}

/**
 * Check if a layer is extended in nuxt.config
 */
async function isLayerExtended(layerName) {
  try {
    const nuxtConfigPath = path.resolve('nuxt.config.ts')
    const nuxtConfig = await fsp.readFile(nuxtConfigPath, 'utf-8')

    // Check if layer is in extends array
    const extendsMatch = nuxtConfig.match(/extends:\s*\[([\s\S]*?)\]/)
    if (extendsMatch) {
      const extendsContent = extendsMatch[1]
      return extendsContent.includes(layerName)
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
 * Detect required layers for a collection configuration
 */
export async function detectRequiredDependencies(config) {
  const required = {
    layers: [],
    missing: []
  }

  // Always check for base CRUD layer first
  const baseLayerInstalled = await isPackageInstalled('@friendlyinternet/nuxt-crouton')
  const baseLayerExtended = await isLayerExtended('@friendlyinternet/nuxt-crouton')

  if (!baseLayerInstalled || !baseLayerExtended) {
    // Fallback to check for local crud layer
    const crudLayerExists = await layerExists('crud')
    if (!crudLayerExists) {
      required.missing.push({
        type: 'layer',
        name: '@friendlyinternet/nuxt-crouton',
        reason: 'Required for CRUD components',
        installCmd: 'pnpm add @friendlyinternet/nuxt-crouton',
        configCmd: `Add '@friendlyinternet/nuxt-crouton' to extends array in nuxt.config.ts`
      })
    } else {
      required.layers.push('crud')
    }
  } else {
    required.layers.push('@friendlyinternet/nuxt-crouton')
  }

  // Check if translations are needed
  const hasTranslations = config?.translations?.collections &&
    Object.keys(config.translations.collections).length > 0

  if (hasTranslations && !config.noTranslations) {
    // Check for nuxt-crouton-translations layer
    const layerInstalled = await isPackageInstalled('@friendlyinternet/nuxt-crouton-translations')
    const layerExtended = await isLayerExtended('@friendlyinternet/nuxt-crouton-translations')

    if (layerInstalled && layerExtended) {
      required.layers.push('@fyit/nuxt-crouton-translations')
    } else {
      // Fallback to check for local translations layer
      const translationsLayerExists = await layerExists('translations')
      if (translationsLayerExists) {
        required.layers.push('translations')
      } else {
        required.missing.push({
          type: 'layer',
          name: '@friendlyinternet/nuxt-crouton-translations',
          reason: 'Required for translation fields',
          installCmd: 'pnpm add @friendlyinternet/nuxt-crouton-translations',
          configCmd: `Add '@friendlyinternet/nuxt-crouton-translations' to extends array in nuxt.config.ts`
        })
      }
    }
  }

  return required
}

/**
 * Display missing dependencies and instructions
 */
export function displayMissingDependencies(dependencies) {
  if (dependencies.missing.length === 0) return true

  console.log('\n❌ Missing Required Dependencies\n')
  console.log('The following layers are required for your collection:')
  console.log('═'.repeat(60))

  dependencies.missing.forEach(dep => {
    console.log(`\n📦 ${dep.name}`)
    console.log(`   Reason: ${dep.reason}`)
    console.log(`\n   Installation steps:`)
    console.log(`   1. Install: ${dep.installCmd}`)
    console.log(`   2. Configure: ${dep.configCmd}`)
  })

  console.log('\n═'.repeat(60))
  console.log('\n💡 Quick install all:')

  const installCmds = dependencies.missing.map(d => d.installCmd.replace('pnpm add ', '')).join(' ')
  console.log(`   pnpm add ${installCmds}`)

  console.log('\nThen add to nuxt.config.ts:')
  console.log(`   extends: [`)
  dependencies.missing.forEach(dep => {
    console.log(`     '${dep.name}',`)
  })
  console.log(`     // ... other layers`)
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
        const layerPaths = layers.map(l => {
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

        // For npm packages, check if already extended (in any format)
        if (isNpmPackage(layer) && content.includes(`'${layer}'`)) {
          continue // Already extended
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
    layers.forEach(layer => {
      const layerPath = isNpmPackage(layer) ? layer : `./layers/${layer}`
      console.log(`     '${layerPath}'`)
    })
  }
}