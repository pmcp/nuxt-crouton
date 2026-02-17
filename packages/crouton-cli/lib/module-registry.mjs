// Module registry for `crouton add` command
// Maps short aliases to full package information
// Source of truth: crouton.manifest.ts files (via manifest-loader)

import { loadModuleRegistryMap } from './utils/manifest-bridge.ts'

// Lazily loaded registry (populated on first access)
let _modules = null

/**
 * Load MODULES from manifests (async, cached).
 * @returns {Promise<Record<string, object>>}
 */
export async function loadModules() {
  if (!_modules) {
    _modules = await loadModuleRegistryMap()
  }
  return _modules
}

/**
 * Get module info by alias or package name
 * @param {string} name - Module alias (e.g., 'bookings') or full package name
 * @returns {Promise<object|undefined>}
 */
export async function getModule(name) {
  const modules = await loadModules()

  // Direct alias match
  if (modules[name]) {
    return modules[name]
  }

  // Search by package name
  for (const [alias, module] of Object.entries(modules)) {
    if (module.package === name) {
      return { ...module, alias }
    }
  }

  return undefined
}

/**
 * Get module alias from package name
 * @param {string} packageName - Full package name
 * @returns {Promise<string|undefined>}
 */
export async function getModuleAlias(packageName) {
  const modules = await loadModules()
  for (const [alias, module] of Object.entries(modules)) {
    if (module.package === packageName) {
      return alias
    }
  }
  return undefined
}

/**
 * List all available modules
 * @returns {Promise<Array<{alias: string, package: string, description: string, hasSchema: boolean, bundled: boolean}>>}
 */
export async function listModules() {
  const modules = await loadModules()
  return Object.entries(modules).map(([alias, module]) => ({
    alias,
    package: module.package,
    description: module.description,
    hasSchema: !!module.hasSchema,
    bundled: !!module.bundled
  }))
}
