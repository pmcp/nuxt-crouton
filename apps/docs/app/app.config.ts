export default defineAppConfig({

  ui: {
    colors: {
      primary: 'green',
      neutral: 'slate'
    },
    footer: {
      slots: {
        root: 'border-t border-default',
        left: 'text-sm text-muted'
      }
    }
  },
  seo: {
    siteName: 'Nuxt Crouton'
  },
  header: {
    title: 'Nuxt Crouton',
    to: '/',
    logo: {
      alt: 'Nuxt Crouton',
      light: '',
      dark: ''
    },
    search: true,
    colorMode: true,
    links: [{
      'icon': 'i-lucide-history',
      'to': '/changelogs',
      'aria-label': 'Changelog Tracker'
    }, {
      'icon': 'i-simple-icons-github',
      'to': 'https://github.com/pmcp/nuxt-crouton',
      'target': '_blank',
      'aria-label': 'Nuxt Crouton on GitHub'
    }]
  },
  footer: {
    credits: `Built with Nuxt Crouton • © ${new Date().getFullYear()}`,
    colorMode: false,
    links: [{
      'icon': 'i-simple-icons-github',
      'to': 'https://github.com/pmcp/nuxt-crouton',
      'target': '_blank',
      'aria-label': 'Nuxt Crouton on GitHub'
    }, {
      'icon': 'i-lucide-book-open',
      'to': 'https://supersaas.dev',
      'target': '_blank',
      'aria-label': 'SuperSaaS'
    }]
  },
  toc: {
    title: 'Table of Contents',
    bottom: {
      title: 'Community',
      edit: 'https://github.com/pmcp/nuxt-crouton/edit/main/docs',
      links: [{
        icon: 'i-lucide-star',
        label: 'Star on GitHub',
        to: 'https://github.com/pmcp/nuxt-crouton',
        target: '_blank'
      }, {
        icon: 'i-lucide-package',
        label: 'SuperSaaS Starter',
        to: 'https://supersaas.dev',
        target: '_blank'
      }]
    }
  }
})
