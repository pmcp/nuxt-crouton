import { fileURLToPath } from 'node:url'

const _currentDir = fileURLToPath(new URL('.', import.meta.url))

// Development startup deduplication guard (mirrors the other crouton layers)
const _dependencies = (globalThis as unknown as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-layout')) {
  _dependencies.add('crouton-layout')
}

/**
 * Nuxt Crouton Layout Layer (@fyit/crouton-layout)
 *
 * The deterministic layout engine, extracted from crouton-core (epic #751):
 * - the layout editor + renderer (`CroutonLayout*` components)
 * - the deterministic default-layout compose pass (`layout-compose` / `layout-viability` / `layout-tree` / `layout-edit`)
 * - the placeable layout blocks (`croutonLayoutBlocks` app.config registry — defaults: collection-list / entity-form / stats)
 * - the `layout_configs` storage (schema + GET/PUT API + the `/admin/[team]/layout` page)
 *
 * Dependency is strictly ONE-WAY: crouton-layout → crouton-core. Packages
 * contribute blocks via the `croutonLayoutBlocks` app.config registry, so this
 * layer needs no knowledge of bookings/sales/etc. and they need no dep on it.
 *
 * Default-on: `@fyit/crouton` (meta-layer) extends this, the same way core
 * auto-includes i18n/auth/admin. Scaffolded in #753; populated by #754–#757.
 */
export default defineNuxtConfig({
  // One-way dependency: extend core (which already pulls i18n/auth/admin).
  extends: [
    '@fyit/crouton-core'
  ]
})
