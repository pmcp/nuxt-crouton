/**
 * Domain Context Composable
 *
 * Detects if the current request is from a custom domain and provides
 * context about the resolved team.
 *
 * @example
 * ```vue
 * <script setup>
 * const { isCustomDomain, resolvedDomain } = useDomainContext()
 *
 * // Hide team selector on custom domain sites
 * const showTeamSelector = computed(() => !isCustomDomain.value)
 * </script>
 * ```
 */
export function useDomainContext() {
  const nuxtApp = useNuxtApp()
  const config = useRuntimeConfig()

  // Get domain context from SSR payload or event
  const domainContext = useState('crouton-domain-context', () => {
    // On server, try to get from event context
    if (import.meta.server) {
      const event = useRequestEvent()
      if (event) {
        return {
          isCustomDomain: event.context.isCustomDomain || false,
          resolvedDomain: event.context.resolvedDomain || null,
          resolvedTeamId: event.context.resolvedDomainTeamId || null
        }
      }
    }
    // Default state
    return {
      isCustomDomain: false,
      resolvedDomain: null,
      resolvedTeamId: null
    }
  })

  // Computed properties for easy access
  const isCustomDomain = computed(() => domainContext.value.isCustomDomain)
  const resolvedDomain = computed(() => domainContext.value.resolvedDomain)
  const resolvedTeamId = computed(() => domainContext.value.resolvedTeamId)

  // Check if we should hide team-specific UI elements
  const hideTeamInUrl = computed(() => {
    // On custom domains, the team is implicit in the domain
    return isCustomDomain.value
  })

  // Get the current hostname
  const hostname = computed(() => {
    if (import.meta.server) {
      const event = useRequestEvent()
      if (event) {
        return getRequestHost(event, { xForwardedHost: true })?.split(':')[0] || null
      }
    }
    if (import.meta.client) {
      return window.location.hostname
    }
    return null
  })

  // Check if current hostname is a known app domain
  const isAppDomain = computed(() => {
    if (!hostname.value) return false
    const appDomains = (config.public?.croutonPages?.appDomains as string[] | undefined) || []
    return appDomains.some(d => hostname.value === d || hostname.value?.endsWith(`.${d}`))
  })

  return {
    /** Whether the current request is from a verified custom domain */
    isCustomDomain,
    /** The custom domain hostname (if any) */
    resolvedDomain,
    /** The team ID resolved from the custom domain */
    resolvedTeamId,
    /** Whether to hide team slug in URLs (true on custom domains) */
    hideTeamInUrl,
    /** Current hostname */
    hostname,
    /** Whether current hostname is a known app domain */
    isAppDomain
  }
}
