import { describe, it, expect } from 'vitest'
import { compile } from '@vue/compiler-dom'
import { createCroutonSrcTransform } from '../src/runtime/transform/croutonSrc'

/**
 * Proves the riskiest assumption of #490: a Vue *compiler* transform (unlike Vue
 * DevTools' dev-only `data-v-inspector`) emits the attribute into compiled output,
 * so it survives a real build. We compile SFC templates directly and assert the
 * generated render code carries `data-crouton-src` with the relative source path.
 */
function render(template: string, filename: string, rootDir = '/repo') {
  return compile(template, {
    filename,
    nodeTransforms: [createCroutonSrcTransform(rootDir)]
  }).code
}

describe('createCroutonSrcTransform', () => {
  it('stamps the root element with the relative .vue path', () => {
    const code = render(
      `<div class="card"><span>hi</span></div>`,
      '/repo/app/components/Card.vue'
    )
    expect(code).toContain('data-crouton-src')
    expect(code).toContain('app/components/Card.vue')
  })

  it('stamps only the root element, not nested ones', () => {
    const code = render(`<div><span><b>x</b></span></div>`, '/repo/X.vue')
    const count = (code.match(/data-crouton-src/g) || []).length
    expect(count).toBe(1)
  })

  it('skips third-party components under node_modules', () => {
    const code = render(
      `<div>x</div>`,
      '/repo/node_modules/.pnpm/@nuxt+ui@4.9.0/node_modules/@nuxt/ui/dist/runtime/components/Avatar.vue'
    )
    expect(code).not.toContain('data-crouton-src')
  })

  it('ignores non-.vue sources', () => {
    const code = render(`<div>x</div>`, '/repo/whatever.js?vue&type=template')
    expect(code).not.toContain('data-crouton-src')
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
