import {thinkgraphChatConversationsConfig} from '../layers/thinkgraph/collections/chatconversations/app/composables/useThinkgraphChatConversations';

import {translationsUiConfig} from '@fyit/crouton-i18n/app/composables/useTranslationsUi';

import {thinkgraphGraphsConfig} from '../layers/thinkgraph/collections/graphs/app/composables/useThinkgraphGraphs';

import {thinkgraphCanvasesConfig} from '../layers/thinkgraph/collections/canvases/app/composables/useThinkgraphCanvases';

import {thinkgraphNodesConfig} from '../layers/thinkgraph/collections/nodes/app/composables/useThinkgraphNodes';

import {thinkgraphInjectRequestsConfig} from '../layers/thinkgraph/collections/injectrequests/app/composables/useThinkgraphInjectRequests';

import {thinkgraphProjectsConfig} from '../layers/thinkgraph/collections/projects/app/composables/useThinkgraphProjects';

export default defineAppConfig({
  croutonCollections: {
    thinkgraphChatConversations: thinkgraphChatConversationsConfig,
    translationsUi: translationsUiConfig,
    thinkgraphGraphs: thinkgraphGraphsConfig,
    thinkgraphCanvases: thinkgraphCanvasesConfig,
    thinkgraphNodes: thinkgraphNodesConfig,
    thinkgraphInjectRequests: thinkgraphInjectRequestsConfig,
    thinkgraphProjects: thinkgraphProjectsConfig,
  },

  croutonApps: {
    thinkgraph: {
      id: 'thinkgraph',
      name: 'ThinkGraph',
      icon: 'i-lucide-brain-circuit',
      adminRoutes: [
        {
          path: '/projects',
          label: 'Projects',
          icon: 'i-lucide-folder-kanban'
        }
      ],
      dashboardRoutes: [],
      settingsRoutes: []
    }
  }
})
