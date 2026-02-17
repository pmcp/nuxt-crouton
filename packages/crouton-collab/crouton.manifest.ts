import { defineCroutonManifest } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-collab',
  name: 'Collaboration',
  description: 'Real-time collaboration with Yjs CRDTs',
  icon: 'i-lucide-users',
  version: '1.0.0',
  category: 'addon',
  aiHint: 'use when app needs real-time collaboration',
  dependencies: [],
})
