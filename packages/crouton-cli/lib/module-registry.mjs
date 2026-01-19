// Module registry for `crouton add` command
// Maps short aliases to full package information

/**
 * @typedef {Object} CroutonModule
 * @property {string} package - Full npm package name
 * @property {string|null} schemaExport - Import path for schema export (null if no database tables)
 * @property {string} description - Human-readable description
 * @property {string[]} [tables] - Database tables created by this module
 * @property {string[]} [dependencies] - Other modules that must be installed first
 * @property {string[]} [peerDependencies] - Optional peer dependencies to check
 * @property {boolean} [bundled] - Whether this module is bundled in @fyit/crouton
 */

/** @type {Record<string, CroutonModule>} */
export const MODULES = {
  auth: {
    package: '@fyit/crouton-auth',
    schemaExport: '@fyit/crouton-auth/server/database/schema/auth',
    description: 'Authentication with Better Auth - teams, billing, passkeys, 2FA',
    tables: ['user', 'session', 'account', 'verification', 'organization', 'member', 'invitation', 'passkey', 'twoFactor', 'subscription'],
    dependencies: [],
    peerDependencies: ['better-auth', '@better-auth/passkey', '@better-auth/stripe'],
    bundled: true // Included in @fyit/crouton
  },

  i18n: {
    package: '@fyit/crouton-i18n',
    schemaExport: '@fyit/crouton-i18n/server/database/schema',
    description: 'Multi-language support with database-backed translations',
    tables: ['translationsUi'],
    dependencies: ['auth'],
    peerDependencies: ['@nuxtjs/i18n'],
    bundled: true // Included in @fyit/crouton
  },

  admin: {
    package: '@fyit/crouton-admin',
    schemaExport: null, // No database tables
    description: 'Admin dashboard components',
    tables: [],
    dependencies: ['auth'],
    peerDependencies: [],
    bundled: true // Included in @fyit/crouton
  },

  bookings: {
    package: '@fyit/crouton-bookings',
    schemaExport: null, // Uses generated collections, no built-in schema
    description: 'Booking system - slots and inventory-based reservations',
    tables: [], // Tables come from generated collections
    dependencies: ['auth'],
    peerDependencies: ['@nuxtjs/i18n', '@internationalized/date', '@vueuse/core']
  },

  editor: {
    package: '@fyit/crouton-editor',
    schemaExport: null, // No database tables
    description: 'Rich text editor - TipTap-based with slash commands',
    tables: [],
    dependencies: [],
    peerDependencies: ['@nuxt/ui']
  },

  assets: {
    package: '@fyit/crouton-assets',
    schemaExport: null, // Uses generated collections
    description: 'Asset management - media library with NuxtHub blob storage',
    tables: [],
    dependencies: [],
    peerDependencies: ['@nuxthub/core', '@vueuse/core']
  },

  events: {
    package: '@fyit/crouton-events',
    schemaExport: null, // Uses generated collections
    description: 'Event tracking - audit trail for all CRUD operations',
    tables: [],
    dependencies: [],
    peerDependencies: ['@nuxt/ui']
  },

  flow: {
    package: '@fyit/crouton-flow',
    schemaExport: null, // No database tables
    description: 'Vue Flow integration - interactive node graphs',
    tables: [],
    dependencies: [],
    peerDependencies: ['@vue-flow/core']
  },

  email: {
    package: '@fyit/crouton-email',
    schemaExport: null, // No database tables (uses external service)
    description: 'Email integration with Vue Email and Resend',
    tables: [],
    dependencies: [],
    peerDependencies: []
  },

  maps: {
    package: '@fyit/crouton-maps',
    schemaExport: null, // No database tables
    description: 'Map integration with Mapbox',
    tables: [],
    dependencies: [],
    peerDependencies: []
  },

  ai: {
    package: '@fyit/crouton-ai',
    schemaExport: null, // No database tables
    description: 'AI integration with Anthropic Claude',
    tables: [],
    dependencies: [],
    peerDependencies: []
  },

  devtools: {
    package: '@fyit/crouton-devtools',
    schemaExport: null, // No database tables
    description: 'Nuxt Devtools integration for Crouton',
    tables: [],
    dependencies: [],
    peerDependencies: []
  },

  collab: {
    package: '@fyit/crouton-collab',
    schemaExport: null, // Uses Cloudflare Durable Objects
    description: 'Real-time collaboration with Yjs CRDTs',
    tables: [],
    dependencies: [],
    peerDependencies: ['yjs', 'y-protocols']
  },

  pages: {
    package: '@fyit/crouton-pages',
    schemaExport: null, // Uses generated collections
    description: 'Page builder with TipTap editor',
    tables: [],
    dependencies: ['editor'],
    peerDependencies: []
  },

  themes: {
    package: '@fyit/crouton-themes',
    schemaExport: null, // No database tables
    description: 'Swappable UI themes for Nuxt UI',
    tables: [],
    dependencies: [],
    peerDependencies: ['@nuxt/ui']
  },

  'schema-designer': {
    package: '@fyit/crouton-schema-designer',
    schemaExport: null, // No database tables
    description: 'Visual schema editor for collection generation',
    tables: [],
    dependencies: [],
    peerDependencies: ['@nuxt/ui']
  }
}

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