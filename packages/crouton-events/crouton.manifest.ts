import { defineCroutonManifest } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-events',
  name: 'Event Tracking',
  description: 'Event tracking - audit trail for all CRUD operations',
  icon: 'i-lucide-activity',
  version: '1.0.0',
  category: 'addon',
  aiHint: 'use when app needs audit trail or event tracking',
  dependencies: [],
})
