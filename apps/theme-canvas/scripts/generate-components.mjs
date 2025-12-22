#!/usr/bin/env node
/**
 * Generates component registry from installed @nuxt/ui package
 * Run: node scripts/generate-components.mjs
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const NUXT_UI_COMPONENTS = join(__dirname, '../node_modules/@nuxt/ui/dist/runtime/components')
const OUTPUT_FILE = join(__dirname, '../app/composables/componentList.generated.ts')

// Category mapping based on component names
const CATEGORY_MAP = {
  // Forms
  Input: 'form', InputDate: 'form', InputMenu: 'form', InputNumber: 'form',
  InputTags: 'form', InputTime: 'form', Textarea: 'form', Select: 'form',
  SelectMenu: 'form', Checkbox: 'form', CheckboxGroup: 'form', Radio: 'form',
  RadioGroup: 'form', Switch: 'form', Slider: 'form', PinInput: 'form',
  ColorPicker: 'form', FileUpload: 'form', Form: 'form', FormField: 'form',

  // Navigation
  Breadcrumb: 'navigation', Link: 'navigation', NavigationMenu: 'navigation',
  Pagination: 'navigation', Stepper: 'navigation', Tabs: 'navigation',

  // Overlays
  Modal: 'overlay', Slideover: 'overlay', Drawer: 'overlay', Popover: 'overlay',
  Tooltip: 'overlay', DropdownMenu: 'overlay', ContextMenu: 'overlay',
  Toast: 'overlay', CommandPalette: 'overlay',

  // Data display
  Table: 'data', Accordion: 'data', Carousel: 'data', Timeline: 'data',
  Tree: 'data', User: 'data', Empty: 'data', Marquee: 'data', ScrollArea: 'data',

  // Layout
  App: 'layout', Container: 'layout', Main: 'layout', Header: 'layout',
  Footer: 'layout', Page: 'layout', Error: 'layout',
}

// Default category for unmapped components
const DEFAULT_CATEGORY = 'element'

function getCategory(name) {
  return CATEGORY_MAP[name] || DEFAULT_CATEGORY
}

function generateComponentList() {
  const files = readdirSync(NUXT_UI_COMPONENTS)

  // Get unique component names (from .vue files, excluding .d.ts)
  const componentNames = files
    .filter(f => f.endsWith('.vue') && !f.includes('.d.'))
    .map(f => f.replace('.vue', ''))
    .sort()

  console.log(`Found ${componentNames.length} components`)

  // Generate the list
  const componentList = componentNames.map(name => ({
    name: `U${name}`,
    title: name,
    category: getCategory(name),
  }))

  // Generate TypeScript file
  const output = `/**
 * AUTO-GENERATED from @nuxt/ui package
 * Run: node scripts/generate-components.mjs
 * Generated: ${new Date().toISOString()}
 */

export const GENERATED_COMPONENTS = ${JSON.stringify(componentList, null, 2)} as const

export const GENERATED_COMPONENT_NAMES = GENERATED_COMPONENTS.map(c => c.name)
`

  writeFileSync(OUTPUT_FILE, output)
  console.log(`Generated ${OUTPUT_FILE}`)

  // Print summary by category
  const byCategory = {}
  componentList.forEach(c => {
    byCategory[c.category] = (byCategory[c.category] || 0) + 1
  })
  console.log('\nBy category:')
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`)
  })
}

generateComponentList()
