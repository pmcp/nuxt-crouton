import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    // Use X-Correlation-ID if provided by caller, otherwise generate
    const incoming = event.node.req.headers['x-correlation-id']
    event.context.correlationId = (
      typeof incoming === 'string' ? incoming : null
    ) ?? crypto.randomUUID()
  })
})
