import { thinkgraphDecisionsConfig } from '../layers/thinkgraph/collections/decisions/app/composables/useThinkgraphDecisions'

import {thinkgraphChatConversationsConfig} from '../layers/thinkgraph/collections/chatconversations/app/composables/useThinkgraphChatConversations';

import {translationsUiConfig} from '@fyit/crouton-i18n/app/composables/useTranslationsUi';

export default defineAppConfig({
  croutonCollections: {
    thinkgraphDecisions: thinkgraphDecisionsConfig,
    thinkgraphChatConversations: thinkgraphChatConversationsConfig,
    translationsUi: translationsUiConfig
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