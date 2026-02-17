import { defineCroutonManifest } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-assets',
  name: 'Asset Management',
  description: 'Asset management - media library with NuxtHub blob storage',
  icon: 'i-lucide-folder-open',
  version: '1.0.0',
  category: 'addon',
  aiHint: 'use when app has media uploads or file management',
  dependencies: [],
  provides: {
    components: [
      { name: 'CroutonAssetsPicker', description: 'Asset picker with gallery', props: ['modelValue', 'crop'] },
      { name: 'CroutonAssetsLibrary', description: 'Media library browser', props: ['teamId'] },
    ],
  },
})
