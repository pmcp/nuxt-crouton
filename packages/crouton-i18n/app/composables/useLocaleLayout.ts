import type { Ref } from 'vue'

// ─── Composable ───────────────────────────────────────────────────────────────

export function useLocaleLayout(
  locales: Ref<any[]>,
  primaryLocaleProp: Ref<string | undefined>,
  secondaryLocaleProp: Ref<string | undefined>,
  layout: Ref<'tabs' | 'side-by-side' | undefined>,
) {
  // Layout mode (defaults to tabs for backwards compatibility)
  const layoutMode = computed(() => layout.value ?? 'tabs')

  // All locale codes derived from i18n locales
  const allLocaleCodes = computed(() =>
    locales.value.map(l => (typeof l === 'string' ? l : l.code)),
  )

  // Active locale for tabs mode
  const { locale } = useI18n()
  const editingLocale = ref(locale.value)

  // Left column locale (defaults to 'en' or first available) — for side-by-side
  const primaryEditingLocale = ref(
    primaryLocaleProp.value ||
    (allLocaleCodes.value.includes('en') ? 'en' : allLocaleCodes.value[0]) ||
    'en',
  )

  // Right column locale — for side-by-side
  const secondaryEditingLocale = ref(
    secondaryLocaleProp.value ||
    allLocaleCodes.value.find(code => code !== primaryEditingLocale.value) ||
    'nl',
  )

  // Locale options for dropdowns
  const allLocaleOptions = computed(() =>
    allLocaleCodes.value.map(code => ({ value: code, label: code.toUpperCase() })),
  )

  // Detect when both panels show the same language
  const isSameLocale = computed(() => primaryEditingLocale.value === secondaryEditingLocale.value)

  // User-togglable column count for side-by-side mode
  const showDualColumns = ref(true)

  // Narrow-screen tab tracking (shows ALL locales)
  const narrowLocaleTab = ref(primaryEditingLocale.value)

  const narrowLocaleTabs = computed(() =>
    allLocaleCodes.value.map(code => ({
      value: code,
      label: code.toUpperCase(),
    })),
  )

  // Sync narrow tab when primary locale changes
  watch(primaryEditingLocale, (primary) => {
    if (!allLocaleCodes.value.includes(narrowLocaleTab.value)) {
      narrowLocaleTab.value = primary
    }
  })

  // Refs to secondary column BlockEditorWithPreview instances (per field)
  // NOTE: kept here because they are tightly coupled with the isSameLocale watcher
  const secondaryEditorRefs = ref<Record<string, any>>({})

  // When same locale is selected, switch secondary to preview; otherwise editor
  watch(isSameLocale, (same) => {
    for (const editorRef of Object.values(secondaryEditorRefs.value)) {
      if (editorRef) {
        if (same) {
          editorRef.showPreview?.()
        } else {
          editorRef.showEditor?.()
        }
      }
    }
  })

  return {
    layoutMode,
    allLocaleCodes,
    editingLocale,
    primaryEditingLocale,
    secondaryEditingLocale,
    allLocaleOptions,
    isSameLocale,
    showDualColumns,
    narrowLocaleTab,
    narrowLocaleTabs,
    secondaryEditorRefs,
  }
}
