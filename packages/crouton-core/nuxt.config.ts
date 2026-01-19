import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import type { NitroConfig } from 'nitropack'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('nuxt-crouton')) {
  _dependencies.add('nuxt-crouton')
  console.log('🍞 crouton:core ✓ Layer loaded')
}

// Resolve @crouton/auth package path (handles both installed and workspace:* scenarios)
let croutonAuthPath: string | undefined
try {
  const require = createRequire(import.meta.url)
  // Resolve the main export, then derive the team-auth path
  const mainPath = require.resolve('@fyit/crouton-auth')
  // mainPath is nuxt.config.ts in package root, so only need one dirname
  const pkgRoot = dirname(mainPath)
  const teamAuthPath = join(pkgRoot, 'server/utils/team-auth.ts')

  // Verify the file exists
  if (existsSync(teamAuthPath)) {
    croutonAuthPath = teamAuthPath
  } else {
    console.warn('🍞 crouton:core @crouton/auth found but team-auth.ts missing at:', teamAuthPath)
  }
} catch {
  // @crouton/auth not installed - will use fallback or error at runtime
}

export default defineNuxtConfig({
  // Auto-include i18n, auth, and admin layers
  // Order matters: i18n provides translation system that auth/admin consume
  extends: [
    '@fyit/crouton-i18n',
    '@fyit/crouton-auth',
    '@fyit/crouton-admin'
  ],

  modules: ['@nuxthub/core', '@nuxt/ui', '@vueuse/nuxt', '@nuxt/image', '@nuxtjs/seo'],

  // NuxtHub configuration for database, KV, blob storage
  // Apps can override with different providers (postgresql, mysql) or resource IDs
  hub: {
    db: 'sqlite' // Uses D1 on Cloudflare, local SQLite in dev
  },

  // Inject crouton.config.js at build time for runtime access
  hooks: {
    'nitro:config': async (nitroConfig: NitroConfig) => {
      const configPaths = [
        join(process.cwd(), 'crouton.config.js'),
        join(process.cwd(), 'crouton.config.js')
      ]

      for (const configPath of configPaths) {
        if (existsSync(configPath)) {
          try {
            const config = await import(configPath)
            nitroConfig.runtimeConfig = nitroConfig.runtimeConfig || {}
            nitroConfig.runtimeConfig.public = nitroConfig.runtimeConfig.public || {}
            nitroConfig.runtimeConfig.public.croutonConfig = config.default
            console.log('🍞 crouton:core Loaded config from:', configPath)
          } catch (err) {
            console.warn('🍞 crouton:core Failed to load config:', err)
          }
          break
        }
      }
    }
  },

  plugins: [
    { src: join(currentDir, 'app/plugins/tree-styles.client.ts'), mode: 'client' }
  ],
  $meta: {
    description: 'Base CRUD layer for FYIT collections',
    name: 'nuxt-crouton'
  },


  components: {
    dirs: [
      {
        path: join(currentDir, 'app/components'),
        prefix: 'Crouton',
        global: true
      },
      {
        // Stubs - low priority so other packages can override
        // e.g., nuxt-crouton-editor overrides CroutonEditorSimple
        path: join(currentDir, 'app/components/stubs'),
        global: true,
        priority: -1
      }
    ]
  },

  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  // Alias for collection type registry - allows module augmentation
  alias: {
    '#crouton/types': join(currentDir, 'app/types/collections.ts')
  },

  // Make registry available and auto-import server utils
  nitro: {
    imports: {
      dirs: [join(currentDir, 'server/utils')]
    },
    alias: {
      '#crouton/registry': './registry',
      // Team auth uses @crouton/auth (Better Auth) when available
      ...(croutonAuthPath && { '#crouton/team-auth': croutonAuthPath })
    }
  }
})
