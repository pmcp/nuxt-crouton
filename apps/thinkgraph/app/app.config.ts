import { thinkgraphDecisionsConfig } from '../layers/thinkgraph/collections/decisions/app/composables/useThinkgraphDecisions'

import {thinkgraphChatConversationsConfig} from '../layers/thinkgraph/collections/chatconversations/app/composables/useThinkgraphChatConversations';

import {translationsUiConfig} from '@fyit/crouton-i18n/app/composables/useTranslationsUi';

import {thinkgraphGraphsConfig} from '../layers/thinkgraph/collections/graphs/app/composables/useThinkgraphGraphs';

import {thinkgraphCanvasesConfig} from '../layers/thinkgraph/collections/canvases/app/composables/useThinkgraphCanvases';

import {thinkgraphNodesConfig} from '../layers/thinkgraph/collections/nodes/app/composables/useThinkgraphNodes';

import {thinkgraphInjectRequestsConfig} from '../layers/thinkgraph/collections/injectrequests/app/composables/useThinkgraphInjectRequests';

export default defineAppConfig({
  croutonCollections: {
    thinkgraphDecisions: thinkgraphDecisionsConfig,
    thinkgraphChatConversations: thinkgraphChatConversationsConfig,
    translationsUi: translationsUiConfig,
    thinkgraphGraphs: thinkgraphGraphsConfig,
    thinkgraphCanvases: thinkgraphCanvasesConfig,
    thinkgraphNodes: thinkgraphNodesConfig,
    thinkgraphInjectRequests: thinkgraphInjectRequestsConfig
  },

  croutonApps: {
    thinkgraph: {
      id: 'thinkgraph',
      name: 'ThinkGraph',
      icon: 'i-lucide-brain-circuit',
      adminRoutes: [
        {
          path: '/graphs',
          label: 'ThinkGraph',
          icon: 'i-lucide-brain-circuit'
        }
      ],
      dashboardRoutes: [],
      settingsRoutes: []
    }
  }
})