/**
 * Connector Installation Utility
 *
 * Handles installation and setup of external connectors
 */

import fsp from 'node:fs/promises'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import readline from 'node:readline'

const execAsync = promisify(exec)

// Helper to check if file exists
async function fileExists(filePath) {
  try {
    await fsp.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Prompt user for input
 */
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

/**
 * Install connector package
 *
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<boolean>} Success
 */
export async function installConnectorPackage(projectRoot) {
  try {
    console.log('📦 Installing @friendlyinternet/nuxt-crouton-supersaas...')

    const { stdout, stderr } = await execAsync(
      'pnpm add @friendlyinternet/nuxt-crouton-supersaas',
      { cwd: projectRoot }
    )

    if (stderr && !stderr.includes('Progress')) {
      console.warn('⚠ Installation warnings:', stderr)
    }

    console.log('✓ Package installed')
    return true
  } catch (error) {
    console.error('✗ Failed to install connector package:', error.message)
    return false
  }
}

/**
 * Add connector package to nuxt.config.ts extends array
 *
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<boolean>} Success
 */
export async function addConnectorToNuxtConfig(projectRoot) {
  try {
    const nuxtConfigPath = path.join(projectRoot, 'nuxt.config.ts')

    if (!(await fileExists(nuxtConfigPath))) {
      console.warn('⚠ nuxt.config.ts not found, skipping extends update')
      return false
    }

    let content = await fsp.readFile(nuxtConfigPath, 'utf-8')

    // Check if already in extends
    if (content.includes('@friendlyinternet/nuxt-crouton-supersaas')) {
      console.log('✓ nuxt-crouton-supersaas already in extends')
      return true
    }

    // Find extends array and add connector
    const extendsRegex = /(extends:\s*\[)/
    if (extendsRegex.test(content)) {
      // Add after nuxt-crouton (if present) or at beginning
      const replacement = content.includes('@friendlyinternet/nuxt-crouton\'')
        ? `$1\n    '@friendlyinternet/nuxt-crouton',\n    '@friendlyinternet/nuxt-crouton-supersaas',`
        : `$1\n    '@friendlyinternet/nuxt-crouton-supersaas',`

      content = content.replace(
        /(extends:\s*\[[\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*'@friendlyinternet\/nuxt-crouton',)/,
        replacement
      )

      // If nuxt-crouton not found, add at start of extends
      if (!content.includes('@friendlyinternet/nuxt-crouton-supersaas')) {
        content = content.replace(extendsRegex, `$1\n    '@friendlyinternet/nuxt-crouton-supersaas',`)
      }
    }

    await fsp.writeFile(nuxtConfigPath, content)
    console.log('✓ Added nuxt-crouton-supersaas to extends')
    return true
  } catch (error) {
    console.error('✗ Failed to update nuxt.config.ts:', error.message)
    return false
  }
}

/**
 * Update app.config.ts to register the connector from package
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} collectionName - Collection name (e.g., 'users')
 * @param {string} connectorType - Connector type (e.g., 'supersaas')
 * @returns {Promise<boolean>} Success
 */
export async function updateAppConfigWithPackageImport(projectRoot, collectionName, connectorType) {
  try {
    const appConfigPath = path.join(projectRoot, 'app/app.config.ts')

    if (!(await fileExists(appConfigPath))) {
      console.warn('⚠ app.config.ts not found, skipping auto-registration')
      console.log(`ℹ You'll need to manually register ${collectionName} in app.config.ts`)
      return false
    }

    let content = await fsp.readFile(appConfigPath, 'utf-8')
    let modified = false

    // Add import from package (not local file)
    const importStatement = `import { ${collectionName}Config } from '@friendlyinternet/nuxt-crouton-supersaas/${connectorType}'`

    // Check if import already exists
    if (!content.includes(importStatement)) {
      // Find existing import block and add after it
      const importBlockMatch = content.match(/^((?:import\s+(?:\S.*)?\n)*)/m)

      if (importBlockMatch) {
        const existingImports = importBlockMatch[0]
        // Insert import at the end of the import block
        content = content.replace(existingImports, `${existingImports}${importStatement}\n`)
      } else {
        // No imports found, add at the very top
        content = `${importStatement}\n\n${content}`
      }

      // Validate import was added
      if (!content.includes(importStatement)) {
        throw new Error(`Failed to add import statement for ${collectionName}Config`)
      }

      console.log(`✓ Added import for ${collectionName}Config`)
      modified = true
    } else {
      console.log(`✓ Import for ${collectionName}Config already exists`)
    }

    // Check if already registered in croutonCollections
    const collectionEntryPattern = new RegExp(`${collectionName}:\\s*${collectionName}Config`)

    if (!collectionEntryPattern.test(content)) {
      // Add to croutonCollections
      const collectionEntry = `    ${collectionName}: ${collectionName}Config,`

      if (content.includes('croutonCollections:')) {
        // Find croutonCollections object and add entry after the opening brace
        const croutonCollectionsRegex = /(croutonCollections:\s*\{)/
        content = content.replace(croutonCollectionsRegex, `$1\n${collectionEntry}`)

        // Validate collection entry was added
        if (!content.includes(`${collectionName}: ${collectionName}Config`)) {
          throw new Error(`Failed to add collection entry for ${collectionName}`)
        }

        console.log(`✓ Added ${collectionName} to croutonCollections`)
        modified = true
      } else {
        // croutonCollections doesn't exist yet - that's OK
        // Collection generation will create it and add the entry
        console.log(`ℹ croutonCollections not found - will be created during collection generation`)
        console.log(`ℹ ${collectionName} entry will be added by updateRegistry()`)
      }
    } else {
      console.log(`✓ ${collectionName} already in croutonCollections`)
    }

    // Only write if we made changes
    if (modified) {
      await fsp.writeFile(appConfigPath, content)
      console.log(`✓ Updated app.config.ts with ${collectionName} from package`)
    } else {
      console.log(`✓ ${collectionName} already fully configured in app.config.ts`)
    }

    return true
  } catch (error) {
    console.error('✗ Failed to update app.config.ts:', error.message)
    return false
  }
}

/**
 * Interactive setup for a single connector
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} collectionName - Collection name
 * @param {Array} recommendations - Recommended connectors
 * @returns {Promise<boolean>} Success
 */
export async function setupConnectorInteractive(projectRoot, collectionName, recommendations) {
  console.log(`\n⚠ External reference detected: :${collectionName}`)
  console.log(`ℹ This collection is managed outside Crouton (e.g., by your auth system)`)

  const answer = await prompt(`\nConfigure connector for '${collectionName}'? (Y/n): `)

  if (answer.toLowerCase() === 'n') {
    console.log(`⊘ Skipped ${collectionName} connector setup`)
    return false
  }

  // Show recommendations
  console.log(`\nAvailable connectors for '${collectionName}':`)
  recommendations.forEach((rec, idx) => {
    console.log(`  ${idx + 1}. ${rec.description}`)
  })
  console.log(`  ${recommendations.length + 1}. Skip (configure manually)`)

  const choice = await prompt(`\nSelect connector (1-${recommendations.length + 1}): `)
  const choiceNum = Number.parseInt(choice, 10)

  if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > recommendations.length + 1) {
    console.log('✗ Invalid choice')
    return false
  }

  if (choiceNum === recommendations.length + 1) {
    console.log(`⊘ Skipped ${collectionName} connector setup`)
    return false
  }

  const selectedConnector = recommendations[choiceNum - 1]

  // Install package if needed
  const isInstalled = await fileExists(
    path.join(projectRoot, 'node_modules/@friendlyinternet/nuxt-crouton-supersaas')
  )

  if (!isInstalled) {
    const installSuccess = await installConnectorPackage(projectRoot)
    if (!installSuccess) return false
  } else {
    console.log('✓ Connector package already installed')
  }

  // Add connector to nuxt.config extends
  await addConnectorToNuxtConfig(projectRoot)

  // Update app.config to import from package
  await updateAppConfigWithPackageImport(projectRoot, collectionName, selectedConnector.type)

  console.log(`\n✓ ${collectionName} connector setup complete!`)
  console.log(`  ✓ Package: @friendlyinternet/nuxt-crouton-supersaas`)
  console.log(`  ✓ Layer: Added to nuxt.config.ts extends`)
  console.log(`  ✓ Config: Imported in app.config.ts`)
  console.log(`\n  Everything is configured via the layer - no files copied!`)

  return true
}

/**
 * Helper to capitalize string
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
