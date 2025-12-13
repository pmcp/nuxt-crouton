/**
 * Stub translation composable for base nuxt-crouton layer
 *
 * Provides English fallbacks for standalone usage.
 * When nuxt-crouton-i18n layer is installed (and listed AFTER this layer),
 * its useT will override this stub via Nuxt's layer precedence.
 */
export function useT() {
  const fallbacks: Record<string, string> = {
    'table.search': 'Search',
    'table.selectAll': 'Select all',
    'table.selectRow': 'Select row',
    'table.createdAt': 'Created At',
    'table.updatedAt': 'Updated At',
    'table.createdBy': 'Created By',
    'table.updatedBy': 'Updated By',
    'table.actions': 'Actions',
    'table.display': 'Display',
    'table.rowsPerPage': 'Rows per page',
    'table.showing': 'Showing',
    'table.to': 'to',
    'table.of': 'of',
    'table.results': 'results',
    'common.loading': 'Loading',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.update': 'Update'
  }

  const translate = (key: string, _options?: any): string => fallbacks[key] || key
  const translateString = (key: string, options?: any): string => translate(key, options)
  const translateContent = (entity: any, field: string): string => entity?.[field] || ''

  return {
    t: translate,
    tString: translateString,
    tContent: translateContent,
    tInfo: (key: string) => ({
      key,
      value: translate(key),
      mode: 'system' as const,
      category: 'ui',
      isMissing: !fallbacks[key],
      hasTeamOverride: false
    }),
    hasTranslation: (key: string) => !!fallbacks[key],
    getAvailableLocales: () => ['en'],
    getTranslationMeta: (key: string) => ({
      key,
      value: translate(key),
      hasTeamOverride: false,
      isSystemMissing: !fallbacks[key],
      availableLocales: ['en']
    }),
    refreshTranslations: async () => {},
    locale: ref('en'),
    isDev: false,
    devModeEnabled: ref(false)
  }
}
