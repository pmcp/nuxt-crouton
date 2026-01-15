// Database schema exports
// This file is auto-managed by crouton-generate

// Export auth schema from crouton-auth package
export * from '@friendlyinternet/nuxt-crouton-auth/server/database/schema/auth'

// Export all collection tables
export { rakimConfigs } from '../../layers/rakim/collections/configs/server/database/schema'
export { rakimDiscussions } from '../../layers/rakim/collections/discussions/server/database/schema'
export { rakimFlowinputs } from '../../layers/rakim/collections/flowinputs/server/database/schema'
export { rakimFlowoutputs } from '../../layers/rakim/collections/flowoutputs/server/database/schema'
export { rakimInboxmessages } from '../../layers/rakim/collections/inboxmessages/server/database/schema'
export { rakimJobs } from '../../layers/rakim/collections/jobs/server/database/schema'
export { rakimTasks } from '../../layers/rakim/collections/tasks/server/database/schema'
export { rakimUsermappings } from '../../layers/rakim/collections/usermappings/server/database/schema'
export { rakimFlows } from '../../layers/rakim/collections/flows/server/database/schema'
