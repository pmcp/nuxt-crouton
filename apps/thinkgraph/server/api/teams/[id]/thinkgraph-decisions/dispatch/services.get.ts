import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getAllDispatchServices, isServiceAvailable } from '~~/server/utils/dispatch-registry'

// Import all services to register them
import '~~/server/utils/dispatch-services/dalle3'
import '~~/server/utils/dispatch-services/flux'
import '~~/server/utils/dispatch-services/lovable'
import '~~/server/utils/dispatch-services/v0'
import '~~/server/utils/dispatch-services/code'
import '~~/server/utils/dispatch-services/text'
import '~~/server/utils/dispatch-services/mermaid'

export default defineEventHandler(async (event) => {
  await resolveTeamAndCheckMembership(event)

  const services = getAllDispatchServices()

  return services.map(service => ({
    id: service.id,
    name: service.name,
    description: service.description,
    type: service.type,
    icon: service.icon,
    options: service.options || [],
    available: isServiceAvailable(service, event),
  }))
})
