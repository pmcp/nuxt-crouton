import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getAllDispatchServices, isServiceAvailable, ensureServicesLoaded } from '~~/server/utils/dispatch-registry'

export default defineEventHandler(async (event) => {
  await resolveTeamAndCheckMembership(event)

  await ensureServicesLoaded()
  const services = getAllDispatchServices()
  console.log('[dispatch/services] registry size:', services.length, services.map(s => s.id))

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
