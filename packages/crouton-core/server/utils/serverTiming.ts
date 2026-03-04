import type { H3Event } from 'h3'

interface TimingEntry {
  name: string
  duration?: number
  description?: string
}

interface TimingHandle {
  end: () => void
}

interface ServerTiming {
  start: (name: string) => TimingHandle
  add: (name: string, duration?: number, description?: string) => void
}

export function useServerTiming(event: H3Event): ServerTiming {
  if (!event.context._serverTimings) {
    event.context._serverTimings = [] as TimingEntry[]
  }

  const timings = event.context._serverTimings as TimingEntry[]

  return {
    start(name: string): TimingHandle {
      const startTime = performance.now()
      return {
        end() {
          timings.push({ name, duration: performance.now() - startTime })
        }
      }
    },

    add(name: string, duration?: number, description?: string) {
      timings.push({ name, duration, description })
    }
  }
}

export function buildServerTimingHeader(timings: TimingEntry[]): string {
  return timings
    .map((t) => {
      let value = t.name
      if (t.duration != null) value += `;dur=${t.duration.toFixed(1)}`
      if (t.description) value += `;desc="${t.description}"`
      return value
    })
    .join(', ')
}
