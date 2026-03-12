/**
 * Single-Team Client-Side Router Guard
 *
 * Mirrors the server-side Nitro plugin (single-team-rewrite.ts) for client-side
 * navigation. In single-team mode, public URLs omit the team slug
 * (e.g., /en/about instead of /acme/en/about). The server handles this via a
 * Nitro plugin, but client-side navigation bypasses the server — Vue Router sees
 * /en/about and can't match it to [team]/[locale]/[...slug].
 *
 * This plugin adds a router.beforeEach guard that prepends the team slug.
 */
const SKIP_PREFIXES = ['api', '_nuxt', '__nuxt', 'auth', 'admin', 'super-admin', 'dashboard']

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const singleTeam = config.public?.croutonPages?.singleTeam as { slug?: string } | undefined

  if (!singleTeam?.slug) return

  const slug = singleTeam.slug
  const router = useRouter()

  router.beforeEach((to) => {
    const segments = to.path.split('/').filter(Boolean)

    if (segments.length === 0) return

    const firstSegment = segments[0]!

    // Already has team slug — no rewrite needed
    if (firstSegment === slug) return

    // Skip reserved prefixes and file-like paths
    if (SKIP_PREFIXES.includes(firstSegment)) return
    if (firstSegment.includes('.')) return

    // Rewrite: prepend team slug, preserve query and hash
    return `/${slug}${to.fullPath}`
  })
})
