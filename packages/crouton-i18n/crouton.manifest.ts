import { defineCroutonManifest } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-i18n',
  name: 'Internationalization',
  description: 'Multi-language support with database-backed translations',
  icon: 'i-lucide-languages',
  version: '1.0.0',
  category: 'core',
  bundled: true,
  dependencies: ['@fyit/crouton-auth'],
  collections: [
    { name: 'translationsUi', tableName: 'translationsUi', description: 'UI translation overrides' },
  ],
  provides: {
    composables: ['useT'],
  },
})
