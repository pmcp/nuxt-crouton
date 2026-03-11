import { thinkgraphDecisionsConfig } from '../layers/thinkgraph/collections/decisions/app/composables/useThinkgraphDecisions'

export default defineAppConfig({
  croutonCollections: {
    thinkgraphDecisions: thinkgraphDecisionsConfig
  }
})