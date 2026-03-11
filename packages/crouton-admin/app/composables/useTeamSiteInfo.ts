/**
 * Composable for accessing team site settings (contact, links, social)
 *
 * Fetches site settings from the API and provides reactive access.
 * Settings are cached in useState to avoid refetching on navigation.
 */
export function useTeamSiteInfo() {
  const { teamId } = useTeamContext()

  const siteSettings = useState<Record<string, any> | null>('team-site-settings', () => null)

  const { data, status } = useFetch<Record<string, any>>(() => {
    if (!teamId.value) return null as any
    return `/api/teams/${teamId.value}/settings/site`
  }, {
    watch: [teamId],
    immediate: !siteSettings.value
  })

  watch(data, (val) => {
    if (val) siteSettings.value = val
  }, { immediate: true })

  const contactEmail = computed(() => siteSettings.value?.contactEmail || '')
  const newsletterUrl = computed(() => siteSettings.value?.newsletterUrl || '')
  const calendarUrl = computed(() => siteSettings.value?.calendarUrl || '')
  const registrationUrl = computed(() => siteSettings.value?.registrationUrl || '')
  const socialLinks = computed(() => siteSettings.value?.socialLinks || {})
  const isLoading = computed(() => status.value === 'pending')

  return {
    siteSettings,
    contactEmail,
    newsletterUrl,
    calendarUrl,
    registrationUrl,
    socialLinks,
    isLoading
  }
}
