import { defineCroutonManifest } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-flow',
  name: 'Vue Flow',
  description: 'Vue Flow integration - interactive node graphs',
  icon: 'i-lucide-workflow',
  version: '1.0.0',
  category: 'addon',
  aiHint: 'use when app has workflows, pipelines, or visual graphs',
  dependencies: [],
  provides: {
    components: [
      { name: 'CroutonFlowCanvas', description: 'Vue Flow canvas', props: ['nodes', 'edges'] },
    ],
  },
})
