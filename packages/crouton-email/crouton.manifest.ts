import { defineCroutonManifest } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-email',
  name: 'Email',
  description: 'Email integration with Vue Email and Resend',
  icon: 'i-lucide-mail',
  version: '1.0.0',
  category: 'addon',
  aiHint: 'use when app sends transactional or marketing emails',
  dependencies: [],
})
