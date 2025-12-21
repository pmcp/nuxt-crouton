import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import type { NitroConfig } from 'nitropack'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Resolve @crouton/auth package path (handles both installed and workspace:* scenarios)
let croutonAuthPath: string | undefined
try {
  const require = createRequire(import.meta.url)
  // Resolve the main export, then derive the team-auth path
  const mainPath = require.resolve('@friendlyinternet/nuxt-crouton-auth')
  // mainPath is nuxt.config.ts in package root, so only need one dirname
  const pkgRoot = dirname(mainPath)
  const teamAuthPath = join(pkgRoot, 'server/utils/team-auth.ts')

  // Verify the file exists
  if (existsSync(teamAuthPath)) {
    croutonAuthPath = teamAuthPath
  } else {
    console.warn('[nuxt-crouton] @crouton/auth found but team-auth.ts missing at:', teamAuthPath)
  }
} catch {
  // @crouton/auth not installed - will use fallback or error at runtime
}

export default defineNuxtConfig({

  modules: ['@nuxt/ui', '@vueuse/nuxt', '@nuxt/image', '@nuxtjs/seo'],

  // Inject crouton.config.js at build time for runtime access
  hooks: {
    'nitro:config': async (nitroConfig: NitroConfig) => {
      const configPaths = [
        join(process.cwd(), 'crouton.config.js'),
        join(process.cwd(), 'crouton.config.mjs')
      ]

      for (const configPath of configPaths) {
        if (existsSync(configPath)) {
          try {
            const config = await import(configPath)
            nitroConfig.runtimeConfig = nitroConfig.runtimeConfig || {}
            nitroConfig.runtimeConfig.public = nitroConfig.runtimeConfig.public || {}
            nitroConfig.runtimeConfig.public.croutonConfig = config.default
            console.log('[nuxt-crouton] Loaded crouton config from:', configPath)
          } catch (err) {
            console.warn('[nuxt-crouton] Failed to load crouton config:', err)
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
      }
    ]
  },

  imports: {
    dirs: [join(currentDir, 'app/composables')]
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
