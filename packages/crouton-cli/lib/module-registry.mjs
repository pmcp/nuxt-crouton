// Module registry for `crouton add` command
// Maps short aliases to full package information
// Source of truth: module-registry.json (shared with crouton-designer)

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * @typedef {Object} CroutonModule
 * @property {string} package - Full npm package name
 * @property {string|null} schemaExport - Import path for schema export (null if no database tables)
 * @property {string} description - Human-readable description
 * @property {string[]} [tables] - Database tables created by this module
 * @property {string[]} [dependencies] - Other modules that must be installed first
 * @property {string[]} [peerDependencies] - Optional peer dependencies to check
 * @property {boolean} [bundled] - Whether this module is bundled in @fyit/crouton
 * @property {string|null} [aiHint] - When AI should suggest this package (null = don't suggest)
 */

/** @type {Record<string, CroutonModule>} */
export const MODULES = require('./module-registry.json')

/**
 * Get module info by alias or package name
 * @param {string} name - Module alias (e.g., 'bookings') or full package name
 * @returns {CroutonModule|undefined}
 */
export function getModule(name) {
  // Direct alias match
  if (MODULES[name]) {
    return MODULES[name]
  }

  // Search by package name
  for (const [alias, module] of Object.entries(MODULES)) {
    if (module.package === name) {
      return { ...module, alias }
    }
  }

  return undefined
}

/**
 * Get module alias from package name
 * @param {string} packageName - Full package name
 * @returns {string|undefined}
 */
export function getModuleAlias(packageName) {
  for (const [alias, module] of Object.entries(MODULES)) {
    if (module.package === packageName) {
      return alias
    }
  }
  return undefined
}

/**
 * List all available modules
 * @returns {Array<{alias: string, package: string, description: string, hasSchema: boolean, bundled: boolean}>}
 */
export function listModules() {
  return Object.entries(MODULES).map(([alias, module]) => ({
    alias,
    package: module.package,
    description: module.description,
    hasSchema: !!module.schemaExport,
    bundled: !!module.bundled
  }))
}
