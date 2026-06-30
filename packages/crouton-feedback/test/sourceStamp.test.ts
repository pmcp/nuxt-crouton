import { describe, it, expect } from 'vitest'
import { compile } from '@vue/compiler-dom'
import { createSourceStampTransform } from '../src/runtime/transform/sourceStamp'

/**
 * Proves the riskiest assumption: a Vue *compiler* transform (unlike Vue
 * DevTools' dev-only `data-v-inspector`) emits the attribute into compiled
 * output, so it survives a real build. We compile SFC templates directly and
 * assert the generated render code carries `data-feedback-src` with the relative
 * source path.
 */
function render(template: string, filename: string, rootDir = '/repo') {
  return compile(template, {
    filename,
    // Cast at the boundary: the monorepo resolves two @vue/compiler-core versions
    // (3.5.x), so NodeTransform isn't nominally identical across them at typecheck.
    nodeTransforms: [createSourceStampTransform(rootDir) as never]
  }).code
}

describe('createSourceStampTransform', () => {
  it('stamps the root element with the relative .vue path', () => {
    const code = render(
      `<div class="card"><span>hi</span></div>`,
      '/repo/app/components/Card.vue'
    )
    expect(code).toContain('data-feedback-src')
    expect(code).toContain('app/components/Card.vue')
  })

  it('stamps only the root element, not nested ones', () => {
    const code = render(`<div><span><b>x</b></span></div>`, '/repo/X.vue')
    const count = (code.match(/data-feedback-src/g) || []).length
    expect(count).toBe(1)
  })

  it('skips third-party components under node_modules', () => {
    const code = render(
      `<div>x</div>`,
      '/repo/node_modules/.pnpm/@nuxt+ui@4.9.0/node_modules/@nuxt/ui/dist/runtime/components/Avatar.vue'
    )
    expect(code).not.toContain('data-feedback-src')
  })

  it('ignores non-.vue sources', () => {
    const code = render(`<div>x</div>`, '/repo/whatever.js?vue&type=template')
    expect(code).not.toContain('data-feedback-src')
  })

  it('strips the Vite query suffix before matching .vue', () => {
    const code = render(
      `<div>x</div>`,
      '/repo/app/components/Card.vue?vue&type=template&lang.js'
    )
    expect(code).toContain('app/components/Card.vue')
    expect(code).not.toContain('?vue')
  })
})
