// Database schema exports
// This file is auto-managed by crouton-generate

// Export auth schema from crouton-auth package
export * from '@fyit/crouton-auth/server/database/schema/auth'
// Export i18n schema (crouton-core extends crouton-i18n, table must exist)
export { translationsUi } from './translations-ui'
export { flowConfigs } from '@fyit/crouton-flow/server/database/schema'
export { thinkgraphChatConversations } from '../../layers/thinkgraph/collections/chatconversations/server/database/schema'
export { thinkgraphGraphs } from '../../layers/thinkgraph/collections/graphs/server/database/schema'

export { thinkgraphNodes } from '../../layers/thinkgraph/collections/nodes/server/database/schema'
export { thinkgraphInjectRequests } from '../../layers/thinkgraph/collections/injectrequests/server/database/schema'
export { thinkgraphProjects } from '../../layers/thinkgraph/collections/projects/server/database/schema'
// Legacy collections removed in v2 Phase 0:
// - thinkgraphDecisions (merged into thinkgraphNodes)
// - thinkgraphWorkItems (merged into thinkgraphNodes)
export { thinkgraphWatchedRepos } from '../../layers/thinkgraph/collections/watchedrepos/server/database/schema'
export { thinkgraphWatchReports } from '../../layers/thinkgraph/collections/watchreports/server/database/schema'
