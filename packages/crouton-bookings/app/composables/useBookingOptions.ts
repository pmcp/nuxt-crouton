/**
 * useBookingOptions - Composable for fetching and looking up booking option labels
 *
 * Provides translated labels for user-defined options like statuses and groups.
 * Fetches settings once and caches them for lookup.
 */

interface OptionItem {
  id: string
  label: string
  value: string
  translations?: {
    label?: Record<string, string>
  }
}

export function useBookingOptions() {
  const { locale } = useI18n()

  // Fetch settings collection using useAsyncData pattern
  const { data: settingsData, pending, error, refresh } = useFetch('/api/bookingsSettings', {
    default: () => [],
  })

  // Extract statuses from settings
  const statuses = computed<OptionItem[]>(() => {
    const settings = settingsData.value?.[0]
    if (!settings?.statuses) return []
    return settings.statuses as OptionItem[]
  })

  // Extract groups from settings
  const groups = computed<OptionItem[]>(() => {
    const settings = settingsData.value?.[0]
    if (!settings?.groups) return []
    return settings.groups as OptionItem[]
  })

  /**
   * Get translated label for an option
   */
  function getTranslatedLabel(item: OptionItem | undefined): string {
    if (!item) return ''

    // Check for translation in current locale
    const translation = item.translations?.label?.[locale.value]
    if (translation) {
      return translation
    }

    // Fallback to default label
    return item.label || item.value || ''
  }

  /**
   * Look up status label by value
   */
  function getStatusLabel(statusValue: string): string {
    if (!statusValue) return ''

    const status = statuses.value.find(s => s.value === statusValue)
    if (status) {
      return getTranslatedLabel(status)
    }

    // Fallback to capitalizing the value
    return statusValue.charAt(0).toUpperCase() + statusValue.slice(1)
  }

  /**
   * Look up group label by value
   */
  function getGroupLabel(groupValue: string): string {
    if (!groupValue) return ''

    const group = groups.value.find(g => g.value === groupValue)
    if (group) {
      return getTranslatedLabel(group)
    }

    // Fallback to capitalizing the value
    return groupValue.charAt(0).toUpperCase() + groupValue.slice(1)
  }

  return {
    statuses,
    groups,
    pending,
    error,
    refresh,
    getStatusLabel,
    getGroupLabel,
    getTranslatedLabel
  }
}
