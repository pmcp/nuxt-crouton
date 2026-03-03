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
  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-i18n',
    '@fyit/crouton-assets',
    '@fyit/crouton-pages',
    '@fyit/crouton-bookings',
    '@fyit/crouton-email',
    './layers/bookings',
    './layers/pages',
    '@fyit/crouton-maps',
    './layers/crouton'
  ],
  hub: {
    blob: true,
    db: 'sqlite'
  },

  // Disable OG Image to reduce bundle size for Cloudflare (saves ~4MB)
  ogImage: { enabled: false },

  // Enable booking email notifications
  runtimeConfig: {
    croutonBookings: {
      email: { enabled: true }
    },
    public: {
      crouton: {
        email: {
          brand: {
            name: 'Velotheek',
            primaryColor: '#0F766E',
            url: '' // Set NUXT_PUBLIC_CROUTON_EMAIL_BRAND_URL in production
          }
        }
      },
      croutonBookings: {
        email: { enabled: true }
      }
    }
  },

  // Disable passkeys for Cloudflare Workers (tsyringe incompatibility)
  croutonAuth: {
    methods: {
      passkeys: false
    }
  },

  // Cloudflare Pages deployment
  nitro: {
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