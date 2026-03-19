// Database schema exports
// This file is auto-managed by crouton-generate

// Export auth schema from crouton-auth package
export * from '@fyit/crouton-auth/server/database/schema/auth'
// Export i18n schema (crouton-core extends crouton-i18n, table must exist)
export { translationsUi } from './translations-ui'
export { thinkgraphDecisions } from '../../layers/thinkgraph/collections/decisions/server/database/schema'
export { flowConfigs } from '@fyit/crouton-flow/server/database/schema'
export { thinkgraphChatConversations } from '../../layers/thinkgraph/collections/chatconversations/server/database/schema'
export { thinkgraphGraphs } from '../../layers/thinkgraph/collections/graphs/server/database/schema'
export { thinkgraphCanvases } from '../../layers/thinkgraph/collections/canvases/server/database/schema'
export { thinkgraphNodes } from '../../layers/thinkgraph/collections/nodes/server/database/schema'
export { thinkgraphInjectRequests } from '../../layers/thinkgraph/collections/injectrequests/server/database/schema'
export { thinkgraphProjects } from '../../layers/thinkgraph/collections/projects/server/database/schema'
export { thinkgraphWorkItems } from '../../layers/thinkgraph/collections/workitems/server/database/schema'
