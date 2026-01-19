// css-setup.mjs - Setup Tailwind CSS @source directive for Nuxt Crouton layers
import fsp from 'node:fs/promises'
import path from 'node:path'

/**
 * Common CSS file locations to check (in order of preference)
 */
const CSS_FILE_LOCATIONS = [
  'app/assets/css/main.css',
  'app/assets/css/tailwind.css',
  'app/assets/css/app.css',
  'assets/css/main.css',
  'assets/css/tailwind.css',
  'app.css',
  'main.css'
]

/**
 * The @source directive to add for scanning Nuxt Crouton layers
 */
const CROUTON_SOURCE_DIRECTIVE = '@source "../../../node_modules/@fyit/crouton*/app/**/*.{vue,js,ts}";'

/**
 * Check if a file exists
 */
async function fileExists(filePath) {
  try {
    await fsp.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Find the main CSS file in the project
 */
async function findMainCssFile(projectRoot = process.cwd()) {
  for (const location of CSS_FILE_LOCATIONS) {
    const fullPath = path.join(projectRoot, location)
    if (await fileExists(fullPath)) {
      return { path: fullPath, relativePath: location }
    }
  }
  return null
}

/**
 * Calculate the correct relative path to node_modules based on CSS file depth
 */
function calculateNodeModulesPath(cssRelativePath) {
  // Count directory depth from project root
  const depth = cssRelativePath.split('/').length - 1
  const upDirs = '../'.repeat(depth + 1) // +1 to get out of the css file's directory
  return `${upDirs}node_modules/@fyit/crouton*/app/**/*.{vue,js,ts}`
}

/**
 * Check if the CSS file already has the @source directive for Nuxt Crouton
 */
async function hasSourceDirective(cssPath) {
  try {
    const content = await fsp.readFile(cssPath, 'utf-8')
    return content.includes('@fyit/crouton')
  } catch {
    return false
  }
}

/**
 * Add the @source directive to an existing CSS file
 */
async function addSourceDirective(cssPath, cssRelativePath) {
  const content = await fsp.readFile(cssPath, 'utf-8')

  // Calculate correct path based on CSS file location
  const nodeModulesPath = calculateNodeModulesPath(cssRelativePath)
  const sourceDirective = `@source "${nodeModulesPath}";`

  // Find where to insert (after @import statements)
  const lines = content.split('\n')
  let insertIndex = 0

  // Find the last @import line
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('@import')) {
      insertIndex = i + 1
    }
  }

  // Check if there's already an @source section
  const hasSourceSection = lines.some(line => line.trim().startsWith('@source'))

  // Build the new content
  let newContent
  if (hasSourceSection) {
    // Add after the last @source line
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('@source')) {
        insertIndex = i + 1
      }
    }
    lines.splice(insertIndex, 0, sourceDirective)
    newContent = lines.join('\n')
  } else {
    // Add after imports with a comment
    const comment = '\n/* Scan Nuxt Crouton layers for Tailwind classes */\n'
    lines.splice(insertIndex, 0, comment + sourceDirective)
    newContent = lines.join('\n')
  }

  await fsp.writeFile(cssPath, newContent, 'utf-8')
  return true
}

/**
 * Create a new CSS file with proper Tailwind setup
 */
async function createCssFile(projectRoot = process.cwd()) {
  // Prefer app/assets/css/main.css for Nuxt 4 projects
  const cssDir = path.join(projectRoot, 'app', 'assets', 'css')
  const cssPath = path.join(cssDir, 'main.css')
  const relativePath = 'app/assets/css/main.css'

  // Create directory if needed
  await fsp.mkdir(cssDir, { recursive: true })

  const nodeModulesPath = calculateNodeModulesPath(relativePath)

  const content = `@import "tailwindcss";
@import "@nuxt/ui";

/* Scan Nuxt Crouton layers for Tailwind classes */
@source "${nodeModulesPath}";
`

  await fsp.writeFile(cssPath, content, 'utf-8')
  return { path: cssPath, relativePath }
}

/**
 * Update nuxt.config.ts to include the CSS file
 */
async function ensureCssInNuxtConfig(projectRoot, cssRelativePath) {
  const configPath = path.join(projectRoot, 'nuxt.config.ts')

  try {
    let config = await fsp.readFile(configPath, 'utf-8')

    // Check if css array exists and includes our file
    const cssArrayMatch = config.match(/css:\s*\[([\s\S]*?)\]/)

    // Normalize the path for Nuxt 4 (remove 'app/' prefix since ~/ points to project root)
    // In Nuxt 4, ~/assets/css/main.css resolves to app/assets/css/main.css
    const normalizedPath = cssRelativePath.replace(/^app\//, '')
    const nuxtCssPath = `'~/${normalizedPath}'`

    if (cssArrayMatch) {
      // Check if already included (check both original and normalized paths)
      if (cssArrayMatch[1].includes(cssRelativePath) || cssArrayMatch[1].includes(normalizedPath)) {
        return true // Already configured
      }

      // Add to existing array
      const currentCss = cssArrayMatch[1]
      const hasTrailingComma = currentCss.trim().endsWith(',')
      const newEntry = hasTrailingComma ? `\n    ${nuxtCssPath}` : `,\n    ${nuxtCssPath}`
      config = config.replace(cssArrayMatch[0], `css: [${currentCss}${newEntry}\n  ]`)
    } else {
      // Add css array to config
      const configMatch = config.match(/defineNuxtConfig\s*\(\s*\{/)
      if (configMatch) {
        const insertIndex = configMatch.index + configMatch[0].length
        const cssBlock = `\n  css: [${nuxtCssPath}],`
        config = config.slice(0, insertIndex) + cssBlock + config.slice(insertIndex)
      }
    }

    await fsp.writeFile(configPath, config, 'utf-8')
    return true
  } catch (error) {
    console.error(`Failed to update nuxt.config.ts: ${error.message}`)
    return false
  }
}

/**
 * Main function to setup CSS @source directive for Nuxt Crouton
 *
 * @param {string} projectRoot - The project root directory
 * @param {object} options - Options
 * @param {boolean} options.silent - Don't log messages
 * @param {boolean} options.force - Force recreation even if exists
 * @returns {object} - Result with success status and details
 */
export async function setupCroutonCssSource(projectRoot = process.cwd(), options = {}) {
  const { silent = false, force = false } = options
  const log = silent ? () => {} : console.log

  try {
    // Find existing CSS file
    let cssFile = await findMainCssFile(projectRoot)

    if (cssFile) {
      // Check if already configured
      const hasDirective = await hasSourceDirective(cssFile.path)

      if (hasDirective && !force) {
        log(`✓ CSS @source directive already configured in ${cssFile.relativePath}`)
        return { success: true, action: 'already_configured', file: cssFile.relativePath }
      }

      // Add the directive
      await addSourceDirective(cssFile.path, cssFile.relativePath)
      log(`✓ Added @source directive to ${cssFile.relativePath}`)
      return { success: true, action: 'updated', file: cssFile.relativePath }
    }

    // No CSS file found, create one
    log(`↻ No CSS file found, creating app/assets/css/main.css...`)
    cssFile = await createCssFile(projectRoot)

    // Ensure it's included in nuxt.config.ts
    await ensureCssInNuxtConfig(projectRoot, cssFile.relativePath)

    log(`✓ Created ${cssFile.relativePath} with @source directive`)
    log(`✓ Updated nuxt.config.ts to include CSS file`)

    return { success: true, action: 'created', file: cssFile.relativePath }
  } catch (error) {
    if (!silent) {
      console.error(`Failed to setup CSS @source: ${error.message}`)
    }
    return { success: false, error: error.message }
  }
}

/**
 * Display instructions for manual setup if automatic setup fails
 */
export function displayManualCssSetupInstructions() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  MANUAL CSS SETUP REQUIRED                                   ║
╚══════════════════════════════════════════════════════════════╝

Tailwind CSS v4 doesn't automatically scan npm packages.
Add this @source directive to your main CSS file:

  @source "../node_modules/@fyit/crouton*/app/**/*.{vue,js,ts}";

Example (app/assets/css/main.css):
────────────────────────────────────────────────────────────────
  @import "tailwindcss";
  @import "@nuxt/ui";

  /* Scan Nuxt Crouton layers for Tailwind classes */
  @source "../../../node_modules/@fyit/crouton*/app/**/*.{vue,js,ts}";
────────────────────────────────────────────────────────────────

Note: Adjust the "../" depth based on your CSS file location.
See: https://crouton.dev/getting-started/installation#configure-tailwind-css
`)
}

export default {
  setupCroutonCssSource,
  displayManualCssSetupInstructions
}
