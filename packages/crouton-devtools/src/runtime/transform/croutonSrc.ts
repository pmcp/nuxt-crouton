import type { NodeTransform } from '@vue/compiler-core'
import { relative } from 'node:path'

/**
 * Build-time component → source-file stamping for the preview-review overlay
 * (epic #488, sub-issue #490).
 *
 * A Vue compiler `nodeTransform` that injects `data-crouton-src="<relative .vue
 * path>"` onto each component's *root* element at COMPILE time. Because it runs
 * in the compiler (not as a dev-only Vite middleware like Vue DevTools'
 * `data-v-inspector`), the attribute survives `nuxt build` and is present in the
 * deployed staging DOM — which is exactly what a click on a Cloudflare Workers
 * preview needs to resolve to the owning source file.
 *
 * Gating lives in the module (opt-in via `NUXT_PUBLIC_CROUTON_REVIEW`); this
 * transform is only ever installed when review mode is on, so a production build
 * never carries the attribute.
 *
 * We stamp the root element only: a click on any nested node walks up the DOM to
 * the nearest `[data-crouton-src]`, landing on the component that owns it.
 */

// @vue/compiler-core NodeTypes (kept as literals to avoid a const-enum import
// under isolatedModules): ROOT = 0, ELEMENT = 1, TEXT = 2, ATTRIBUTE = 6.
const NODE_ROOT = 0
const NODE_ELEMENT = 1
const NODE_TEXT = 2
const NODE_ATTRIBUTE = 6

const ATTR = 'data-crouton-src'

const STUB_LOC = {
  start: { offset: 0, line: 1, column: 1 },
  end: { offset: 0, line: 1, column: 1 },
  source: ''
} as const

export function createCroutonSrcTransform(rootDir: string): NodeTransform {
  return (node, context) => {
    // Only root-level elements (parent is the template RootNode).
    if (node.type !== NODE_ELEMENT) return
    if (context.parent?.type !== NODE_ROOT) return

    const rawFile = context.filename
    if (!rawFile) return

    // Strip Vite's query suffix (`?vue&type=template&...`) before checking.
    const file = rawFile.split('?')[0]
    if (!file.endsWith('.vue')) return

    // Only stamp first-party source. Third-party components (Nuxt UI, Nuxt
    // internals) live under node_modules and aren't ours to edit — skip them so
    // a click only ever resolves to a file in this repo.
    if (file.includes('/node_modules/')) return

    // Never double-stamp (idempotent across repeated transform passes).
    const already = node.props.some(
      p => p.type === NODE_ATTRIBUTE && p.name === ATTR
    )
    if (already) return

    // Normalise to forward slashes so the emitted path is stable across OSes.
    const rel = (relative(rootDir, file) || file).replace(/\\/g, '/')

    node.props.push({
      type: NODE_ATTRIBUTE,
      name: ATTR,
      value: { type: NODE_TEXT, content: rel, loc: STUB_LOC },
      loc: STUB_LOC,
      nameLoc: STUB_LOC
    } as never)
  }
}
