import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime'
import { setResponseHeader } from 'h3'
import { buildServerTimingHeader } from '../utils/serverTiming'

export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig()
  if ((config as Record<string, any>).crouton?.serverTiming === false) return

  nitroApp.hooks.hook('request', (event) => {
    event.context._serverTimingStart = performance.now()
  })

  nitroApp.hooks.hook('afterResponse', (event) => {
    const start = event.context._serverTimingStart as number | undefined
    if (start == null) return

    const timings = (event.context._serverTimings ?? []) as Array<{
      name: string
      duration?: number
      description?: string
    }>

    timings.unshift({ name: 'total', duration: performance.now() - start })

    setResponseHeader(event, 'Server-Timing', buildServerTimingHeader(timings))
  })
})
