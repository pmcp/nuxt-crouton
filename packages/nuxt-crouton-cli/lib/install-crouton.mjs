#!/usr/bin/env node
// install-crouton.mjs - Install and configure FYIT Crouton layers

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import fsp from 'node:fs/promises'
import path from 'node:path'
import readline from 'node:readline'
import { setupCroutonCssSource, displayManualCssSetupInstructions } from './utils/css-setup.mjs'

const execAsync = promisify(exec)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = query => new Promise(resolve => rl.question(query, resolve))

// Available layers
const LAYERS = {
  '@friendlyinternet/nuxt-crouton': {
    name: '@friendlyinternet/nuxt-crouton',
    description: 'Base Crouton layer with essential components (always required)',
    required: [],
    features: [
      '✨ CroutonFormActionButton component',
      '✨ CroutonFormReferenceSelect component',
      '✨ FormExpandableSlideOver component',
      '✨ Table components with search',
      '✨ Crouton composables (useCrouton, useCollections)'
    ]
  },
  '@friendlyinternet/nuxt-crouton-i18n': {
    name: '@friendlyinternet/nuxt-crouton-i18n',
    description: 'Multi-language addon (requires base layer)',
    requiresBase: true,
    required: ['@nuxtjs/i18n'],
    features: [
      '✨ TranslationsInput component',
      '✨ LanguageSwitcher component',
      '✨ Multi-language support (EN, NL, FR)',
      '✨ Translation composables (useT, useEntityTranslations)',
      '✨ Works with base Crouton features'
    ]
  },
  '@friendlyinternet/nuxt-crouton-editor': {
    name: '@friendlyinternet/nuxt-crouton-editor',
    description: 'Rich text editor addon (requires base layer)',
    requiresBase: true,
    required: ['@tiptap/vue-3', '@tiptap/starter-kit'],
    features: [
      '✨ Rich text editor components',
      '✨ Tiptap integration',
      '✨ Toolbar and formatting options',
      '✨ Works with base Crouton features'
    ]
  }
}

async function checkInstalled(packageName) {
  try {
    const packageJson = JSON.parse(await fsp.readFile('package.json', 'utf-8'))
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    return packageName in deps
  } catch {
    return false
  }
}

async function checkExtended(layerName) {
  try {
    const nuxtConfig = await fsp.readFile('nuxt.config.ts', 'utf-8')
    const extendsMatch = nuxtConfig.match(/extends:\s*\[([\s\S]*?)\]/)
    if (extendsMatch) {
      return extendsMatch[1].includes(layerName)
    }
    return false
  } catch {
    return false
  }
}

async function installPackage(packageName, isDev = false) {
  console.log(`\n📦 Installing ${packageName}...`)
  const cmd = `pnpm add ${isDev ? '-D' : ''} ${packageName}`

  try {
    const { stdout, stderr } = await execAsync(cmd)
    if (stderr && !stderr.includes('WARN')) {
      console.error(`⚠️  Warning: ${stderr}`)
    }
    console.log(`✓ Installed ${packageName}`)
    return true
  } catch (error) {
    console.error(`❌ Failed to install ${packageName}: ${error.message}`)
    return false
  }
}

async function addToNuxtConfig(layerName) {
  try {
    const configPath = 'nuxt.config.ts'
    let content = await fsp.readFile(configPath, 'utf-8')

    // Check if already extended
    if (content.includes(layerName)) {
      console.log(`✓ ${layerName} already extended in nuxt.config.ts`)
      return true
    }

    // Find extends array or create it
    const extendsMatch = content.match(/extends:\s*\[([\s\S]*?)\]/)

    if (extendsMatch) {
      // Add to existing extends
      const currentExtends = extendsMatch[1]
      const hasTrailingComma = currentExtends.trim().endsWith(',')

      const newLayer = hasTrailingComma
        ? `\n    '${layerName}',`
        : `,\n    '${layerName}',`

      const newExtends = currentExtends + newLayer
      content = content.replace(extendsMatch[0], `extends: [${newExtends}\n  ]`)
    } else {
      // Create extends array
      const configMatch = content.match(/defineNuxtConfig\s*\(\s*\{/)
      if (configMatch) {
        const insertIndex = configMatch.index + configMatch[0].length
        const extendsBlock = `\n  extends: [\n    '${layerName}'\n  ],`
        content = content.slice(0, insertIndex) + extendsBlock + content.slice(insertIndex)
      } else {
        console.error(`❌ Could not parse nuxt.config.ts`)
        console.log(`   Please manually add '${layerName}' to your extends array`)
        return false
      }
    }

    await fsp.writeFile(configPath, content, 'utf-8')
    console.log(`✓ Added ${layerName} to nuxt.config.ts extends`)
    return true
  } catch (error) {
    console.error(`❌ Failed to update nuxt.config.ts: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║         FYIT Crouton Layer Installer            ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log()

  // Check if we're in a Nuxt project
  try {
    await fsp.access('nuxt.config.ts')
  } catch {
    console.error('❌ Error: nuxt.config.ts not found')
    console.error('   Please run this command from your Nuxt project root')
    process.exit(1)
  }

  // Check each layer
  const layersToInstall = []

  for (const [key, layerInfo] of Object.entries(LAYERS)) {
    console.log(`\n📋 ${layerInfo.name}`)
    console.log(`   ${layerInfo.description}`)
    if (layerInfo.extends) {
      console.log(`   Extends: ${layerInfo.extends}`)
    }

    const installed = await checkInstalled(layerInfo.name)
    const extended = await checkExtended(layerInfo.name)

    if (installed && extended) {
      console.log(`   ✓ Already installed and configured`)
    } else {
      console.log(`   Features:`)
      layerInfo.features.forEach(f => console.log(`     ${f}`))

      const answer = await question(`\n   Install this layer? (y/n): `)
      if (answer.toLowerCase() === 'y') {
        layersToInstall.push(layerInfo)
      }
    }
  }

  if (layersToInstall.length === 0) {
    console.log('\n✨ No layers to install')
    rl.close()
    return
  }

  console.log('\n═══════════════════════════════════════════════════')
  console.log('Installing selected layers...')
  console.log('═══════════════════════════════════════════════════')

  for (const layerInfo of layersToInstall) {
    // Install required dependencies first
    if (layerInfo.required && layerInfo.required.length > 0) {
      console.log(`\n📦 Installing dependencies for ${layerInfo.name}...`)
      for (const dep of layerInfo.required) {
        await installPackage(dep)
      }
    }

    // Install the layer
    const installed = await installPackage(layerInfo.name)

    if (installed) {
      // Add to nuxt.config.ts extends
      await addToNuxtConfig(layerInfo.name)
    }
  }

  // Setup CSS @source directive for Tailwind
  console.log('\n═══════════════════════════════════════════════════')
  console.log('Setting up Tailwind CSS @source directive...')
  console.log('═══════════════════════════════════════════════════')

  const cssResult = await setupCroutonCssSource(process.cwd())

  if (!cssResult.success) {
    console.log('\n⚠️  Could not automatically setup CSS @source directive')
    displayManualCssSetupInstructions()
  }

  console.log('\n═══════════════════════════════════════════════════')
  console.log('✨ Installation complete!')
  console.log('═══════════════════════════════════════════════════')
  console.log('\nNext steps:')
  console.log('1. Restart your Nuxt dev server')
  console.log('2. Run your scaffolder to generate collections:')
  console.log('   npx crouton-generate <layer> <collection> --fields-file <path>')
  console.log('\nNote: Components from layers are auto-imported and ready to use!')

  rl.close()
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n❌ Installation cancelled')
  process.exit(0)
})

main().catch((error) => {
  console.error('\n❌ Fatal error:', error.message)
  rl.close()
  process.exit(1)
})
