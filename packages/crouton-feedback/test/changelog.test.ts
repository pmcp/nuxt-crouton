import { describe, it, expect } from 'vitest'
import {
  normalizeChangelog,
  latestVersion,
  buildCommitUrl
} from '../src/runtime/tools/changelog-data'
import { createChangelogTool } from '../src/runtime/tools/changelog'

describe('normalizeChangelog', () => {
  it('sorts entries newest (highest v) first', () => {
    const out = normalizeChangelog([
      { v: 1, note: 'first' },
      { v: 3, note: 'third' },
      { v: 2, note: 'second' }
    ])
    expect(out.map(e => e.v)).toEqual([3, 2, 1])
  })

  it('drops entries without a numeric version and non-array input', () => {
    expect(normalizeChangelog([{ note: 'no v' }, { v: 2, note: 'ok' }])).toHaveLength(1)
    expect(normalizeChangelog(null)).toEqual([])
    expect(normalizeChangelog('nope' as unknown)).toEqual([])
  })

  it('defaults a missing note to empty and keeps a truthy commit only', () => {
    const [a, b] = normalizeChangelog([
      { v: 2, commit: 'abc1234' },
      { v: 1, note: 'x', commit: '' }
    ])
    expect(a).toEqual({ v: 2, note: '', commit: 'abc1234' })
    expect(b).toEqual({ v: 1, note: 'x', commit: undefined })
  })
})

describe('latestVersion', () => {
  it('returns the top version or null when empty', () => {
    expect(latestVersion(normalizeChangelog([{ v: 5, note: '' }, { v: 9, note: '' }]))).toBe(9)
    expect(latestVersion([])).toBeNull()
  })
})

describe('buildCommitUrl', () => {
  it('substitutes {commit} in the template', () => {
    expect(buildCommitUrl('https://gh/x/y/commit/{commit}', 'abc')).toBe('https://gh/x/y/commit/abc')
  })

  it('appends the hash when the template has no placeholder', () => {
    expect(buildCommitUrl('https://gh/x/y/commit/', 'abc')).toBe('https://gh/x/y/commit/abc')
  })

  it('returns null when the template or commit is missing', () => {
    expect(buildCommitUrl('', 'abc')).toBeNull()
    expect(buildCommitUrl('https://gh/{commit}', undefined)).toBeNull()
  })
})

describe('createChangelogTool', () => {
  it('describes the menu row and badges the latest version', () => {
    const tool = createChangelogTool({
      getLatest: () => 42,
      hasEntries: () => true,
      setOpen: () => {}
    })
    expect(tool.id).toBe('changelog')
    expect(tool.label).toBe('Changelog')
    expect(tool.isAvailable!()).toBe(true)
    expect(tool.badge!()).toBe('v42')
  })

  it('hides itself and shows no badge when there are no entries', () => {
    const tool = createChangelogTool({
      getLatest: () => null,
      hasEntries: () => false,
      setOpen: () => {}
    })
    expect(tool.isAvailable!()).toBe(false)
    expect(tool.badge!()).toBeNull()
  })

  it('opens and closes via activate/deactivate', () => {
    let open = false
    const tool = createChangelogTool({
      getLatest: () => 1,
      hasEntries: () => true,
      setOpen: (v) => { open = v }
    })
    tool.activate!()
    expect(open).toBe(true)
    tool.deactivate!()
    expect(open).toBe(false)
  })
})
