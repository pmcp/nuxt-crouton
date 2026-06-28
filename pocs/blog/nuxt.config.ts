import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cfStubs = resolve(__dirname, 'server/utils/_cf-stubs')

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // SPIKE (#945): @nuxt/scripts backs the (default PostHog) analytics provider —
  // SSR-safe, consent-aware script loading. The composable stays provider-agnostic.
  modules: ['@fyit/crouton', '@nuxt/scripts'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: { port: 3014 },

  // SPIKE (#945) — crouton-analytics config. Default to the `console` provider so the
  // spike is observable without a PostHog key; flip to `posthog` + fill the key to send
  // real events. The shape here is what `@fyit/crouton-analytics` will read.
  runtimeConfig: {
    public: {
      crouton: {
        analytics: {
          provider: 'console', // 'noop' | 'console' | 'posthog'
          posthog: {
            key: '', // NUXT_PUBLIC_CROUTON_ANALYTICS_POSTHOG_KEY
            host: 'https://us.i.posthog.com'
          }
        }
      }
    }
  },

  // crouton-core transitively extends @fyit/crouton-auth (it provides the
  // auth-gated /admin/** pages + the `auth` route middleware). @fyit/crouton-auth
  // is listed explicitly so the auth layer is an unambiguous, first-class
  // dependency of this POC even if core's extends ever change.
  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-layout',
    '@fyit/crouton-auth',
    '@fyit/crouton-i18n',
    '@fyit/crouton-devtools/eruda',
    './layers/blog'
  ],

  hub: {
    db: 'sqlite'
  },

  // Disable OG Image to reduce bundle size for Cloudflare (saves ~4MB)
  ogImage: { enabled: false },

  // Single-team POC defaults — keep auth simple while we incubate.
  croutonAuth: {
    // Passkeys disabled for Cloudflare Workers (tsyringe incompatibility)
    methods: {
      passkeys: false
    },
    teams: {
      defaultTeamSlug: 'blog',
      allowCreate: false,
      showSwitcher: false
    }
  },

  routeRules: {
    // Static assets — immutable cache (hashed filenames)
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },

    // Auth pages — prerender (static, no data) + no caching fallback
    '/auth/login': { prerender: true },
    '/auth/register': { prerender: true },
    '/auth/**': { headers: { 'cache-control': 'no-store' } },

    // Admin — no caching (personalized, auth-gated)
    '/admin/**': { headers: { 'cache-control': 'no-store' } }
  },

  // Cloudflare Workers deployment — preset supplied at build via NITRO_PRESET
  // (cf:deploy/cf:staging); intentionally NOT pinned here so dev/build stay preset-free.
  nitro: {
    alias: {
      '@better-auth/passkey/client': resolve(cfStubs, 'client'),
      '@better-auth/passkey': cfStubs,
      'tsyringe': cfStubs,
      'reflect-metadata': cfStubs,
      '@peculiar/x509': cfStubs,
      '@simplewebauthn/server': cfStubs
    }
  }
})
