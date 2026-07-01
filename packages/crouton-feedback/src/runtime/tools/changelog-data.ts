/**
 * Pure changelog helpers — no Vue, no Nuxt. Shared by the build-time module
 * (reads/normalizes the JSON file) and the runtime composable (reads the same
 * shape from runtimeConfig), and unit-tested in isolation.
 *
 * A changelog is the JSON-first data source for the Changelog tool: a committed
 * array of `{ v, note, commit? }`, newest first. The curated `note` per version
 * is the whole point (git commit subjects are not a substitute); an optional
 * build-time `buildCommit` stamp fills the current deployed sha the top entry
 * lacks until it is backfilled on the next push.
 */
export interface ChangelogEntry {
  /** Monotonic human version/iteration number (the `vNN` badge). */
  v: number
  /** One curated line describing this version. */
  note: string
  /** Optional commit hash this version shipped as. */
  commit?: string
}

/**
 * Coerce arbitrary parsed JSON into a clean, version-descending entry list.
 * Anything not shaped like an entry (missing numeric `v`) is dropped; a
 * non-array input yields `[]`. Sorting is defensive — the file is authored
 * newest-first, but we don't trust hand edits.
 */
export function normalizeChangelog(raw: unknown): ChangelogEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (e): e is Record<string, unknown> =>
        !!e && typeof e === 'object' && typeof (e as Record<string, unknown>).v === 'number'
    )
    .map(e => ({
      v: e.v as number,
      note: typeof e.note === 'string' ? e.note : '',
      commit: typeof e.commit === 'string' && e.commit ? (e.commit as string) : undefined
    }))
    .sort((a, b) => b.v - a.v)
}

/** Latest (highest) version in an already-normalized list, or null when empty. */
export function latestVersion(entries: ChangelogEntry[]): number | null {
  return entries.length ? entries[0]!.v : null
}

/**
 * Build a commit link from a configurable template. `{commit}` is substituted
 * when present; otherwise the hash is appended. Returns null when either the
 * template or the commit is absent (so the link simply doesn't render).
 */
export function buildCommitUrl(
  template: string | undefined,
  commit: string | undefined
): string | null {
  if (!template || !commit) return null
  return template.includes('{commit}')
    ? template.replace('{commit}', commit)
    : `${template.replace(/\/$/, '')}/${commit}`
}
