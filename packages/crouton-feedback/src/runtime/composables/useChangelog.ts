import { computed, ref } from 'vue'
import { useRuntimeConfig } from 'nuxt/app'
import {
  normalizeChangelog,
  latestVersion,
  buildCommitUrl,
  type ChangelogEntry
} from '../tools/changelog-data'

/**
 * The client-side view of the changelog, read from
 * `runtimeConfig.public.croutonChangelog` (stamped by the module at build from
 * the app's `changelog.json` + an optional git commit). Exposes the normalized
 * entries, the latest version, a shared open flag for the overlay, and a
 * commit-URL builder driven by the configurable template.
 */
export interface ChangelogPublicConfig {
  entries?: ChangelogEntry[]
  /** URL template for commit links; `{commit}` is replaced with the hash. */
  commitUrlTemplate?: string
  /** Current deployed short SHA, stamped at build (empty when git was absent). */
  buildCommit?: string
}

// Module-singleton so the tool factory (opens it) and the overlay (renders it)
// share one reactive flag, the same pattern useFeedbackTools uses for its state.
const open = ref(false)

export function useChangelog() {
  const cfg = (useRuntimeConfig().public.croutonChangelog ?? {}) as ChangelogPublicConfig

  const entries = computed<ChangelogEntry[]>(() => normalizeChangelog(cfg.entries))
  const latest = computed<number | null>(() => latestVersion(entries.value))
  const commitUrlTemplate = cfg.commitUrlTemplate || ''
  const buildCommit = cfg.buildCommit || ''

  function commitUrl(commit?: string): string | null {
    return buildCommitUrl(commitUrlTemplate, commit)
  }

  return { entries, latest, open, commitUrl, buildCommit }
}
