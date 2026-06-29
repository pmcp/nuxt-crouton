import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  useFeedbackTools,
  resetFeedbackTools,
  type FeedbackTool
} from '../src/runtime/composables/useFeedbackTools'

const tool = (over: Partial<FeedbackTool> = {}): FeedbackTool => ({
  id: 'demo',
  label: 'Demo',
  icon: 'i-lucide-bug',
  ...over
})

describe('useFeedbackTools registry', () => {
  beforeEach(() => resetFeedbackTools())

  it('registers a tool and exposes it in the reactive list', () => {
    const { registerTool, tools } = useFeedbackTools()
    expect(tools.value).toHaveLength(0)
    registerTool(tool({ id: 'console', label: 'Console' }))
    expect(tools.value.map(t => t.id)).toEqual(['console'])
  })

  it('ignores a tool without an id', () => {
    const { registerTool, tools } = useFeedbackTools()
    registerTool({ id: '', label: 'x', icon: 'i' })
    expect(tools.value).toHaveLength(0)
  })

  it('re-registering the same id replaces, not duplicates', () => {
    const { registerTool, tools } = useFeedbackTools()
    registerTool(tool({ id: 'a', label: 'First' }))
    registerTool(tool({ id: 'a', label: 'Second' }))
    expect(tools.value).toHaveLength(1)
    expect(tools.value[0].label).toBe('Second')
  })

  it('sorts available tools by order', () => {
    const { registerTool, tools } = useFeedbackTools()
    registerTool(tool({ id: 'b', order: 2 }))
    registerTool(tool({ id: 'a', order: 1 }))
    registerTool(tool({ id: 'c' })) // order undefined → 0
    expect(tools.value.map(t => t.id)).toEqual(['c', 'a', 'b'])
  })

  it('hides tools whose isAvailable() is false', () => {
    const { registerTool, tools } = useFeedbackTools()
    registerTool(tool({ id: 'on', isAvailable: () => true }))
    registerTool(tool({ id: 'off', isAvailable: () => false }))
    expect(tools.value.map(t => t.id)).toEqual(['on'])
  })

  it('toggle activates (awaiting activate) then deactivates', async () => {
    const { registerTool, toggle, isActive } = useFeedbackTools()
    const activate = vi.fn()
    const deactivate = vi.fn()
    const t = tool({ id: 'console', activate, deactivate })
    registerTool(t)

    expect(isActive('console')).toBe(false)
    await toggle(t)
    expect(activate).toHaveBeenCalledOnce()
    expect(isActive('console')).toBe(true)

    await toggle(t)
    expect(deactivate).toHaveBeenCalledOnce()
    expect(isActive('console')).toBe(false)
  })

  it('unregisterTool removes the tool and clears its active state', async () => {
    const { registerTool, unregisterTool, toggle, isActive, tools } = useFeedbackTools()
    const t = tool({ id: 'gone', activate: vi.fn() })
    registerTool(t)
    await toggle(t)
    expect(isActive('gone')).toBe(true)

    unregisterTool('gone')
    expect(tools.value).toHaveLength(0)
    expect(isActive('gone')).toBe(false)
  })
})
