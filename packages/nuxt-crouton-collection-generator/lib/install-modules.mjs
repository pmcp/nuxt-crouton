#!/usr/bin/env node
// install-modules.mjs - Install and configure FYIT scaffolder modules

import { exec } from 'child_process'
import { promisify } from 'util'
import fsp from 'fs/promises'
import path from 'path'
import readline from 'readline'

const execAsync = promisify(exec)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (query) => new Promise(resolve => rl.question(query, resolve))

// Available modules
const MODULES = {
  '@fyit/nuxt-translations': {
    name: '@fyit/nuxt-translations',
    description: 'Translations support for multi-language fields',
    required: ['@nuxtjs/i18n'],
    features: [
      '✨ TranslationsInput component',
      '✨ Multi-language support (EN, NL, FR)',
      '✨ Team-specific translations',
      '✨ Translation composables (useT, useEntityTranslations)'
    ]
  },
  '@fyit/nuxt-crud': {
    name: '@fyit/nuxt-crud',
    description: 'CRUD components and utilities for collections',
    required: [],
    features: [
      '✨ CroutonButton component',
      '✨ CroutonEntitySelect component',
      '✨ ExpandableSlideover component',
      '✨ Table components with search and pagination',
      '✨ CRUD composables (useCrouton, useCollections)'
    ]
  }
}

async function checkInstalled(moduleName) {
  try {
    const packageJson = JSON.parse(await fsp.readFile('package.json', 'utf-8'))
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    return moduleName in deps
  } catch {
    return false
  }
}

async function checkConfigured(moduleName) {
  try {
    const nuxtConfig = await fsp.readFile('nuxt.config.ts', 'utf-8')
    return nuxtConfig.includes(moduleName)
  } catch {
    return false
  }
}

async function installModule(moduleName, isDev = false) {
  console.log(`\n📦 Installing ${moduleName}...`)
  const cmd = `pnpm add ${isDev ? '-D' : ''} ${moduleName}`

  try {
    const { stdout, stderr } = await execAsync(cmd)
    if (stderr && !stderr.includes('WARN')) {
      console.error(`⚠️  Warning: ${stderr}`)
    }
    console.log(`✅ Installed ${moduleName}`)
    return true
  } catch (error) {
    console.error(`❌ Failed to install ${moduleName}: ${error.message}`)
    return false
  }
}

async function addToNuxtConfig(moduleName) {
  try {
    const configPath = 'nuxt.config.ts'
    let content = await fsp.readFile(configPath, 'utf-8')

    // Check if already configured
    if (content.includes(moduleName)) {
      console.log(`✅ ${moduleName} already configured in nuxt.config.ts`)
      return true
    }

    // Find modules array
    const modulesMatch = content.match(/modules:\s*\[([\s\S]*?)\]/)
    if (modulesMatch) {
      const currentModules = modulesMatch[1]
      const hasTrailingComma = currentModules.trim().endsWith(',')

      // Add module to array
      const newModule = hasTrailingComma
        ? `\n    '${moduleName}',`
        : `,\n    '${moduleName}',`

      const newModules = currentModules + newModule
      content = content.replace(modulesMatch[0], `modules: [${newModules}\n  ]`)

      await fsp.writeFile(configPath, content, 'utf-8')
      console.log(`✅ Added ${moduleName} to nuxt.config.ts`)
      return true
    } else {
      console.error(`❌ Could not find modules array in nuxt.config.ts`)
      console.log(`   Please manually add '${moduleName}' to your modules array`)
      return false
    }
  } catch (error) {
    console.error(`❌ Failed to update nuxt.config.ts: ${error.message}`)
    return false
  }
}

async function installDependencies(deps) {
  if (deps.length === 0) return true

  console.log(`\n📦 Installing dependencies: ${deps.join(', ')}`)
  const cmd = `pnpm add ${deps.join(' ')}`

  try {
    await execAsync(cmd)
    console.log(`✅ Dependencies installed`)
    return true
  } catch (error) {
    console.error(`❌ Failed to install dependencies: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║       FYIT Scaffolder Module Installer          ║')
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

  // Check each module
  const modulesToInstall = []

  for (const [key, moduleInfo] of Object.entries(MODULES)) {
    console.log(`\n📋 ${moduleInfo.name}`)
    console.log(`   ${moduleInfo.description}`)

    const installed = await checkInstalled(moduleInfo.name)
    const configured = await checkConfigured(moduleInfo.name)

    if (installed && configured) {
      console.log(`   ✅ Already installed and configured`)
    } else {
      console.log(`   Features:`)
      moduleInfo.features.forEach(f => console.log(`     ${f}`))

      const answer = await question(`\n   Install this module? (y/n): `)
      if (answer.toLowerCase() === 'y') {
        modulesToInstall.push(moduleInfo)
      }
    }
  }

  if (modulesToInstall.length === 0) {
    console.log('\n✨ No modules to install')
    rl.close()
    return
  }

  console.log('\n═══════════════════════════════════════════════════')
  console.log('Installing selected modules...')
  console.log('═══════════════════════════════════════════════════')

  for (const moduleInfo of modulesToInstall) {
    // Install required dependencies first
    if (moduleInfo.required.length > 0) {
      await installDependencies(moduleInfo.required)
    }

    // Install the module
    const installed = await installModule(moduleInfo.name)

    if (installed) {
      // Add to nuxt.config.ts
      await addToNuxtConfig(moduleInfo.name)
    }
  }

  console.log('\n═══════════════════════════════════════════════════')
  console.log('✨ Installation complete!')
  console.log('═══════════════════════════════════════════════════')
  console.log('\nNext steps:')
  console.log('1. Restart your Nuxt dev server')
  console.log('2. Run your scaffolder to generate collections:')
  console.log('   node Scaffolder/scripts/generate-collection.mjs <layer> <collection> --fields-file <path>')

  rl.close()
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n❌ Installation cancelled')
  process.exit(0)
})

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message)
  rl.close()
  process.exit(1)
})