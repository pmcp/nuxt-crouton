import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Resolve @crouton/auth package path (handles both installed and workspace:* scenarios)
let croutonAuthPath: string | undefined
try {
  const require = createRequire(import.meta.url)
  // Resolve the main export, then derive the team-auth path
  const mainPath = require.resolve('@friendlyinternet/crouton-auth')
  // mainPath is typically dist/module.cjs or dist/module.mjs - go up to package root
  const pkgRoot = dirname(dirname(mainPath))
  const teamAuthPath = join(pkgRoot, 'server/utils/team-auth.ts')

  // Verify the file exists
  if (existsSync(teamAuthPath)) {
    croutonAuthPath = teamAuthPath
    console.log('[nuxt-crouton] Found @crouton/auth team-auth at:', croutonAuthPath)
  } else {
    console.warn('[nuxt-crouton] @crouton/auth found but team-auth.ts missing at:', teamAuthPath)
  }
} catch (e) {
  // @crouton/auth not installed - will use fallback or error at runtime
  console.warn('[nuxt-crouton] @crouton/auth not found - #crouton/team-auth alias will not work')
}

export default defineNuxtConfig({
  $meta: {
    name: 'nuxt-crouton',
    description: 'Base CRUD layer for FYIT collections'
  },

  modules: ['@nuxt/ui', '@vueuse/nuxt'],

  plugins: [
    { src: join(currentDir, 'app/plugins/tree-styles.client.ts'), mode: 'client' }
  ],

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
