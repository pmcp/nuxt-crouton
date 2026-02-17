import { defineCroutonManifest } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-editor',
  name: 'Rich Text Editor',
  description: 'Rich text editor - TipTap-based with slash commands',
  icon: 'i-lucide-pen-tool',
  version: '1.0.0',
  category: 'addon',
  aiHint: 'use when app has content/articles/posts/rich text',
  dependencies: [],
  provides: {
    components: [
      { name: 'CroutonEditorSimple', description: 'Simple TipTap editor', props: ['modelValue'] },
    ],
  },
})
