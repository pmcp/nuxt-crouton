import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cfStubs = resolve(__dirname, 'server/utils/_cf-stubs')

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@fyit/crouton'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: { port: 3007 },
  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-i18n',
    '@fyit/crouton-pages',
    '@fyit/crouton-sales',
    './layers/sales',
    './layers/pages'
  ],
  appConfig: {
    croutonApps: {
      sales: {
        landingRoute: {
          path: '/sales/events',
          label: 'sales.title',
          icon: 'i-lucide-shopping-cart'
        }
      }
    }
  },
  hub: {
    db: 'sqlite',
    kv: true
  },

  // Disable OG Image to reduce bundle size for Cloudflare (saves ~4MB)
  ogImage: { enabled: false },

  // Disable passkeys for Cloudflare Workers (tsyringe incompatibility)
  croutonAuth: {
    methods: {
      passkeys: false
    }
  },

  // Enable thermal receipt printing (crouton-sales)
  croutonSales: {
    print: { enabled: true }
  },

  // Runtime config:
  // - printApiKey: shared key the polling spooler uses
  // - print.enabled: gate that controls whether order POST enqueues print jobs
  // Override via NUXT_CROUTON_SALES_PRINT_API_KEY / NUXT_CROUTON_SALES_PRINT_ENABLED.
  runtimeConfig: {
    croutonSales: {
      printApiKey: '1234',
      print: { enabled: true }
    }
  },

  // Cloudflare Pages deployment
  nitro: {
    preset: 'cloudflare-pages',
    sourceMap: false,
    alias: {
      '@better-auth/passkey/client': resolve(cfStubs, 'client'),
      '@better-auth/passkey': cfStubs,
      'tsyringe': cfStubs,
      'reflect-metadata': cfStubs,
      '@peculiar/x509': cfStubs,
      '@simplewebauthn/server': cfStubs,
      'papaparse': cfStubs
    }
  }
})