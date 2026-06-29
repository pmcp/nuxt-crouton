import { defineNuxtPlugin, useRuntimeConfig, useState } from 'nuxt/app'

/**
 * Surfaces the spike's version + changelog inside the crouton-devtools glasses
 * pill (#809/#810) as a registered tool — no package edits, just the public
 * `useCroutonDevTools().registerTool(...)` API.
 *
 * The tool shows a `v{latest}` badge (latest version from the spike's own
 * `app/spike-changelog.json`) and, on toggle, opens the SpikeChangelogTool
 * overlay (mounted once via app.vue) by flipping the shared `spike-changelog-open`
 * useState flag.
 *
 * Gating: client-only, and only when the devtools pill is enabled — local dev or
 * a build with NUXT_PUBLIC_CROUTON_DEVTOOLS / NUXT_PUBLIC_CROUTON_REVIEW (both
 * map to runtimeConfig.public.croutonDevtools, the same flag the module gates on).
 * When the pill isn't present this plugin returns early and registers nothing, so
 * it's a harmless no-op.
 */

interface CroutonDevTool {
  id: string
  label: string
  icon: string
  order?: number
  isAvailable?: () => boolean
  activate?: () => void | Promise<void>
  deactivate?: () => void
  badge?: () => string | number | null
}

interface CroutonDevToolsRegistry {
  registerTool: (tool: CroutonDevTool) => void
}

// `useCroutonDevTools` is auto-imported by @fyit/crouton-devtools — but ONLY when
// the module enables the pill (dev / review build), where unimport rewrites the
// bare call below into the real import. During a plain `nuxt prepare` / typecheck
// (dev:false) that auto-import isn't registered, so we declare it here to keep
// this self-contained file compiling. The runtime call is reached only inside the
// `enabled` guard — i.e. exactly when the composable is present — and is wrapped
// in try/catch so it's a harmless no-op if the pill is absent.
declare function useCroutonDevTools(): CroutonDevToolsRegistry

function getRegistry(): CroutonDevToolsRegistry | null {
  try {
    const reg = useCroutonDevTools()
    return reg && typeof reg.registerTool === 'function' ? reg : null
  } catch {
    return null
  }
}

interface ChangelogEntry {
  v: number
  note: string
  commit?: string
}

// Eager glob so a missing changelog file is an empty set, not a build error
// (the serial spike work owns app/spike-changelog.json and may add it later).
const modules = import.meta.glob('../spike-changelog.json', { eager: true }) as Record<
  string,
  { default?: ChangelogEntry[] } | ChangelogEntry[]
>

function latestVersion(): number | null {
  const mod = Object.values(modules)[0]
  if (!mod) return null
  const data = Array.isArray(mod) ? mod : mod.default
  if (!Array.isArray(data) || !data.length) return null
  const max = data.reduce((m, e) => Math.max(m, e?.v ?? 0), 0)
  return max || null
}

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  // Only when the devtools pill is enabled (dev / review / devtools flag).
  const enabled = import.meta.dev || !!useRuntimeConfig().public.croutonDevtools
  if (!enabled) return

  const registry = getRegistry()
  if (!registry) return

  const open = useState<boolean>('spike-changelog-open', () => false)

  registry.registerTool({
    id: 'changelog',
    label: 'Changelog',
    icon: 'i-lucide-history',
    order: 5,
    badge: () => {
      const v = latestVersion()
      return v === null ? null : `v${v}`
    },
    activate: () => {
      open.value = true
    },
    deactivate: () => {
      open.value = false
    }
  })
})
