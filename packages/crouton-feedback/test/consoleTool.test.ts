import { describe, it, expect, vi } from 'vitest'
import { createConsoleTool, type ErudaLike } from '../src/runtime/tools/console'

describe('console tool', () => {
  it('exposes the menu metadata', () => {
    const tool = createConsoleTool(async () => ({ init: vi.fn(), show: vi.fn(), hide: vi.fn() }))
    expect(tool.id).toBe('console')
    expect(tool.label).toBe('Console')
    expect(tool.order).toBe(1)
  })

  it('lazy-inits eruda once on first activate, then shows; hides on deactivate', async () => {
    const eruda: ErudaLike = { init: vi.fn(), show: vi.fn(), hide: vi.fn() }
    const load = vi.fn(async () => eruda)
    const tool = createConsoleTool(load)

    await tool.activate!()
    expect(load).toHaveBeenCalledOnce()
    expect(eruda.init).toHaveBeenCalledOnce()
    expect(eruda.show).toHaveBeenCalledOnce()

    await tool.activate!()
    expect(load).toHaveBeenCalledOnce() // not re-loaded
    expect(eruda.init).toHaveBeenCalledOnce() // not re-init
    expect(eruda.show).toHaveBeenCalledTimes(2)

    tool.deactivate!()
    expect(eruda.hide).toHaveBeenCalledOnce()
  })
})
