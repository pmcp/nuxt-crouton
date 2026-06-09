/**
 * Page Path Helpers
 *
 * Single source of truth for building public page URLs. Pages are addressed
 * hierarchically — a child page lives at `/{team}/{locale}/{parent-slug}/{child-slug}`
 * — so a URL's slug path is the chain of ancestor slugs from root to leaf.
 *
 * Slugs are unique per team (UNIQUE (teamId, slug)), so the leaf segment alone
 * identifies a page; the ancestor prefix is what makes the URL canonical.
 *
 * Used by useNavigation (nav links), usePageLink (button picker + render), the
 * public render route (SEO/canonical), and the admin "open in public" button —
 * keep them all going through these helpers so the URL format never drifts.
 */

export interface MinimalPage {
  id: string
  slug: string
  parentId?: string | null
  /** Either an already-parsed map, a raw JSON string, or absent. */
  translations?: Record<string, { slug?: string }> | string | null
}

function parseTranslations(
  translations: MinimalPage['translations'],
): Record<string, { slug?: string }> | null {
  if (!translations) return null
  if (typeof translations === 'string') {
    try {
      return JSON.parse(translations)
    } catch {
      return null
    }
  }
  return translations
}

/**
 * Resolve a page's slug for a locale: the translated slug when present,
 * otherwise the base slug. Note that the navigation/pages list endpoint already
 * returns a locale-resolved `slug`, so passing such pages works without
 * translations present (the base slug is the localized one).
 */
export function localizedSlug(page: MinimalPage, locale: string): string {
  const translations = parseTranslations(page.translations)
  return translations?.[locale]?.slug || page.slug || ''
}

/**
 * Build the nested slug path for a page (e.g. "events/summer-fair") by walking
 * the parentId chain to the root. `pagesById` must contain the page's ancestors
 * — when an ancestor is missing the walk stops, yielding a shorter path.
 */
export function buildSlugPath(
  page: MinimalPage,
  pagesById: Map<string, MinimalPage>,
  locale: string,
): string {
  const segments: string[] = []
  const seen = new Set<string>()
  let current: MinimalPage | undefined = page

  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    const segment = localizedSlug(current, locale)
    if (segment) segments.unshift(segment)
    current = current.parentId ? pagesById.get(current.parentId) : undefined
  }

  return segments.join('/')
}

export interface BuildPagePathOptions {
  /** When true (custom domain / locale routing mode) the team slug is omitted. */
  hideTeamInUrl: boolean
  team: string | null
  locale: string
  /** Nested slug path, e.g. "events/summer-fair" (no leading/trailing slash). */
  slugPath: string
}

/**
 * Build the full public path: `/{team?}/{locale}/{slugPath}`.
 * Trailing slashes are trimmed; the locale prefix is always present.
 */
export function buildPagePath(opts: BuildPagePathOptions): string {
  const teamPrefix = opts.hideTeamInUrl ? '' : `/${opts.team}`
  const prefix = `${teamPrefix}/${opts.locale}`
  return `${prefix}/${opts.slugPath || ''}`.replace(/\/+$/, '') || prefix
}
