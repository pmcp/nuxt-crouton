import { seedVeloSolidaire } from '../../seed/velosolidaire'

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ status: 403, statusText: 'Dev only' })
  }

  const body = await readBody(event).catch(() => ({}))

  const result = await seedVeloSolidaire({
    teamId: body?.teamId,
    reset: body?.reset ?? true,
  })

  return {
    success: true,
    ...result,
  }
})
