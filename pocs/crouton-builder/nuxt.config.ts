import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cfStubs = resolve(__dirname, 'server/utils/_cf-stubs')

// https://nuxt.com/docs/api/configuration/nuxt-config
//
// The GRADUATED builder app (#988) — consumes @fyit/crouton-layout's editable renderer
// + serialisation + ticket codec with REAL routing (/builder, /builder/[pageId]) and the
// View Transitions API for the shared-element morph. Scaffolded under pocs/ (rebuilt clean
// from pocs/crouton-builder-demo, not ported); promoted to apps/ on launch.
export default defineNuxtConfig({
  modules: ['@fyit/crouton'],
  css: ['~/assets/css/main.css'],

  // The builder is an interactive Vue Flow canvas behind auth — SSR buys it nothing and
  // the heavy client surface (Vue Flow, drag/snap/pinch) is brittle to server-render. Render
  // it as a SPA: the client hydrates, auth + the /api routes still run server-side. This
  // eliminates the whole SSR-500 class (the deployed board 500'd on server render). #988
  ssr: false,

  // The layout renderer resolves a leaf's block via `<component :is="name">` (a runtime
  // string), which only resolves GLOBALLY-registered components — so the app's demo
  // blocks register global, by bare filename (BuilderBlock). (Package blocks like
  // CroutonLayoutSpikeStats are already global.)
  components: [{ path: '~/components', global: true, pathPrefix: false }],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: { port: 3011 },

  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-layout',
    '@fyit/crouton-flow', // the Vue Flow canvas — the v52 board + Site sitemap
    '@fyit/crouton-i18n',
  ],

  hub: {
    db: 'sqlite',
    kv: true,
  },

  // The shared-element morph between a Site-flow page card and its board (#988):
  // matching `view-transition-name`s let the card grow into the board and shrink back.
  experimental: {
    viewTransition: true,
  },

  // The #974 round-trip endpoint posts a layout spec onto a GitHub issue. Configure the
  // token/repo/issue via env (NUXT_GITHUB_TOKEN, NUXT_PUBLIC_BUILDER_REPO, …); absent →
  // the endpoint returns the formatted comment body to copy by hand (no secret required).
  runtimeConfig: {
    githubToken: '',
    public: {
      builderRepo: 'FriendlyInternet/nuxt-crouton',
    },
  },

  // Disable OG Image to reduce bundle size for Cloudflare (saves ~4MB)
  ogImage: { enabled: false },

  // Disable passkeys for Cloudflare Workers (tsyringe incompatibility)
  croutonAuth: {
    methods: {
      passkeys: false,
    },
  },

  // Stub the passkey/webauthn chain on Cloudflare Workers. `passkeys: false` disables
  // the feature, but the tsyringe/reflect-metadata/webauthn code still bundles and crashes
  // the Worker at init ("tsyringe requires a reflect polyfill") — alias them to empty stubs.
  nitro: {
    alias: {
      '@better-auth/passkey/client': resolve(cfStubs, 'client'),
      '@better-auth/passkey': cfStubs,
      'tsyringe': cfStubs,
      'reflect-metadata': cfStubs,
      '@peculiar/x509': cfStubs,
      '@simplewebauthn/server': cfStubs,
    },
  },
})
