import { defineCroutonManifest, defineGeneratorContribution } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-collab',
  name: 'Collaboration',
  description: 'Real-time collaboration with Yjs CRDTs',
  icon: 'i-lucide-users',
  version: '1.0.0',
  category: 'addon',
  aiHint: 'use when app needs real-time collaboration',
  dependencies: [],

  // Detection patterns — the 'collab: true' collection config flag triggers this package
  detects: {
    collectionConfigFlag: 'collab',
  },
})

// ---------------------------------------------------------------------------
// Generator contribution — adds collab presence indicators to list component
// ---------------------------------------------------------------------------

export const generatorContribution = defineGeneratorContribution({
  enhanceList(ctx) {
    const { detected } = ctx

    if (!detected.collabEnabled) return null

    return {
      collectionProps: `:show-collab-presence="collabConfig"`,
      scriptCode: `
// Get current user for presence filtering
const { data: session } = useSession()

// Collab presence config
const collabConfig = computed(() => ({
  roomType: 'page',
  currentUserId: session.value?.user?.id,
  pollInterval: 5000
}))
`,
    }
  },
})
