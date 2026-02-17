import { defineCroutonManifest } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-designer',
  name: 'Schema Designer',
  description: 'AI-guided schema designer for collection generation',
  icon: 'i-lucide-wand',
  version: '1.0.0',
  category: 'addon',
  dependencies: ['@fyit/crouton-ai'],
  provides: {
    composables: [
      'useCollectionEditor',
      'useSchemaValidation',
      'useSchemaExport',
      'useFieldTypes',
      'useAppScaffold',
    ],
  },
})
