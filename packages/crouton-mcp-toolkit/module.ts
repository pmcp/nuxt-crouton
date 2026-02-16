/**
 * @fyit/crouton-mcp-toolkit Nuxt Module
 *
 * Integrates @nuxtjs/mcp-toolkit to expose Crouton collections
 * as MCP tools, resources, and prompts for AI assistants.
 */
import {
  defineNuxtModule,
  createResolver,
  installModule
} from '@nuxt/kit'
import { defu } from 'defu'
import type { CroutonMcpToolkitConfig } from './types'

export const name = '@fyit/crouton-mcp-toolkit'
export const version = '0.1.0'

const defaults: CroutonMcpToolkitConfig = {
  name: 'crouton',
  enabled: undefined // auto-detect
}

export default defineNuxtModule<CroutonMcpToolkitConfig>({
  meta: {
    name,
    version,
    configKey: 'croutonMcpToolkit',
    compatibility: {
      nuxt: '^3.14.0 || ^4.0.0'
    }
  },

  defaults,

  async setup(moduleConfig, nuxt) {
    const resolver = createResolver(import.meta.url)
    const config = defu(moduleConfig, defaults)

    // Auto-detect: enabled in dev, disabled in prod (unless explicitly set)
    const enabled = config.enabled ?? nuxt.options.dev
    if (!enabled) return

    // Install @nuxtjs/mcp-toolkit
    // The toolkit auto-discovers tools/resources/prompts from ALL Nuxt layers
    // via getLayerDirectories(). Since our files are at server/mcp/{tools,resources,prompts}/,
    // the default dir: 'mcp' resolves correctly for this layer.
    await installModule('@nuxtjs/mcp-toolkit', {
      name: config.name
    })

    // Enable asyncContext so tools can use useEvent()
    nuxt.options.experimental = defu(nuxt.options.experimental, {
      asyncContext: true
    })

    // Add server utilities for auto-import
    nuxt.options.nitro = defu(nuxt.options.nitro, {
      imports: {
        dirs: [resolver.resolve('./server/utils')]
      }
    })

    // Transpile the module
    nuxt.options.build.transpile.push(resolver.resolve('./'))

    if (nuxt.options.dev) {
      console.log(`🍞 crouton:mcp-toolkit ✓ MCP endpoint available at /mcp`)
    }
  }
})

export type { CroutonMcpToolkitConfig } from './types'
