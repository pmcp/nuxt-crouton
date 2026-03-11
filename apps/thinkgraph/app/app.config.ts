import { thinkgraphDecisionsConfig } from '../layers/thinkgraph/collections/decisions/app/composables/useThinkgraphDecisions'

export default defineAppConfig({
  croutonCollections: {
    thinkgraphDecisions: thinkgraphDecisionsConfig
  },

  croutonApps: {
    thinkgraph: {
      id: 'thinkgraph',
      name: 'ThinkGraph',
      icon: 'i-lucide-brain-circuit',
      adminRoutes: [
        {
          path: '/graph',
          label: 'ThinkGraph',
          icon: 'i-lucide-brain-circuit'
        }
      ],
      dashboardRoutes: [],
      settingsRoutes: []
    }
  }
})