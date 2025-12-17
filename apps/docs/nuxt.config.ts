// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxt/content',
    'nuxt-og-image',
    'nuxt-llms'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  content: {
    build: {
      markdown: {
        toc: {
          searchDepth: 1
        }
      }
    },
    database: {
      type: 'sqlite'
    }
  },

  compatibilityDate: '2024-07-11',

  nitro: {
    preset: 'cloudflare_pages'
  },

  routeRules: {
    '/llms.txt': { prerender: false },
    '/llms-full.txt': { prerender: false }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  icon: {
    provider: 'iconify'
  },

  llms: {
    domain: 'https://nuxt-crouton.dev/',
    title: 'Nuxt Crouton',
    description: 'Generate working CRUD applications in 30 seconds. Built for Nuxt 4 with SuperSaaS opinionated setup.',
    full: {
      title: 'Nuxt Crouton - Complete Documentation',
      description: 'Complete guide to building fast, maintainable CRUD applications with Nuxt Crouton for Nuxt 4.'
    },
    sections: [
      {
        title: 'Getting Started',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/getting-started%' }
        ]
      },
      {
        title: 'Core Concepts',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/core-concepts%' }
        ]
      },
      {
        title: 'Generators',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/generators%' }
        ]
      },
      {
        title: 'Working with Data',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/working-with-data%' }
        ]
      },
      {
        title: 'Customization',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/customization%' }
        ]
      },
      {
        title: 'Advanced',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/advanced%' }
        ]
      },
      {
        title: 'API Reference',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/api-reference%' }
        ]
      },
      {
        title: 'Guides',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/guides%' }
        ]
      }
    ]
  }
})
