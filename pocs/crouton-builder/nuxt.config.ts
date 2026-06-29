// https://nuxt.com/docs/api/configuration/nuxt-config
//
// The GRADUATED builder app (#988) — consumes @fyit/crouton-layout's editable renderer
// + serialisation + ticket codec with REAL routing (/builder, /builder/[pageId]) and the
// View Transitions API for the shared-element morph. Scaffolded under pocs/ (rebuilt clean
// from pocs/crouton-builder-demo, not ported); promoted to apps/ on launch.
export default defineNuxtConfig({
  modules: ['@fyit/crouton'],
  css: ['~/assets/css/main.css'],

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
})
