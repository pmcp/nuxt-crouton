<script setup lang="ts">
/**
 * Workspace Editor - Inline Page Editor
 *
 * Renders the page form inline (not in slideover) for the workspace view.
 * Handles loading page data, saving, and emitting events.
 *
 * @example
 * <CroutonPagesWorkspaceEditor
 *   :page-id="selectedPageId"
 *   @save="handleSave"
 *   @delete="handleDelete"
 * />
 */

interface Props {
  /** Page ID to edit (null for create mode) */
  pageId?: string | null
  /** Default parent ID for new pages (pre-fills parentId in create mode) */
  defaultParentId?: string | null
  /** Show a close button in the header (used by InlineEditor) */
  showClose?: boolean
  /** Override the i18n input layout ('tabs' for narrow panels, 'side-by-side' for wide) */
  i18nLayout?: 'tabs' | 'side-by-side'
}

const props = withDefaults(defineProps<Props>(), {
  pageId: null,
  defaultParentId: null,
  showClose: false,
  i18nLayout: 'side-by-side'
})

const emit = defineEmits<{
  save: [page: any]
  delete: [id: string]
  cancel: []
  close: []
}>()

const { t } = useT()
const { useTimeAgo, watchDebounced } = await import('@vueuse/core')
const { pageTypes, getPageType } = usePageTypes()
const { create, update, deleteItems } = useCollectionMutation('pagesPages')
const { locale, locales } = useI18n()

// Locale options for the AI generator
const availableLocales = computed(() =>
  (locales.value as Array<{ code: string, name: string }>).map(l => ({
    code: l.code,
    name: l.name
  }))
)
const collections = useCollections()
const { teamSlug: teamSlugRef } = useTeamContext()

// Get API path from collection config
const collectionConfig = collections.getConfig('pagesPages')
const apiPath = collectionConfig?.apiPath || 'pages-pages'

// Component state
const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref<string | null>(null)

// AI page generator
const showAiGenerator = ref(false)
// Incrementing key forces CroutonI18nInput to fully remount after AI generation
const contentKey = ref(0)

async function applyAiContent(results: Array<{
  locale: string
  content: string
  seoTitle: string
  seoDescription: string
}>) {
  for (const { locale: localeCode, content, seoTitle, seoDescription } of results) {
    // Path 1: collab is connected — inject into Yjs directly so the editor syncs
    if (collabForI18n.value?.setContentJson) {
      try {
        const parsed = JSON.parse(content)
        collabForI18n.value.setContentJson(localeCode, parsed, true)
      }
      catch {
        // Fall through to state-based path
      }
    }

    // Path 2: always update state.translations so the value persists on save
    const translations = state.value.translations as Record<string, Record<string, unknown>> | undefined
    if (!translations) {
      (state.value as any).translations = {
        [localeCode]: { content, seoTitle, seoDescription }
      }
    }
    else if (!translations[localeCode]) {
      translations[localeCode] = { content, seoTitle, seoDescription }
    }
    else {
      translations[localeCode].content = content
      if (seoTitle) translations[localeCode].seoTitle = seoTitle
      if (seoDescription) translations[localeCode].seoDescription = seoDescription
    }
  }

  // Force a full remount of CroutonI18nInput so TipTap reinitialises from state
  contentReady.value = false
  await nextTick()
  contentKey.value++
  contentReady.value = true
}

// Form action mode
const action = computed<'create' | 'update'>(() =>
  props.pageId ? 'update' : 'create'
)

// Get current user for collab
const getCurrentUser = () => {
  try {
    // @ts-expect-error - useSession may not exist if auth package not installed
    if (typeof useSession === 'function') {
      // @ts-expect-error - conditional call
      const { user: sessionUser } = useSession()
      if (sessionUser?.value) {
        const u = sessionUser.value as Record<string, unknown>
        return {
          name: String(u.name || u.email || 'Anonymous'),
          color: undefined
        }
      }
    }
  } catch {
    // Auth package not installed
  }
  return { name: 'Anonymous', color: undefined }
}

// Set up collab for content if package is installed
const collabRoomIdForContent = computed(() =>
  action.value === 'update' && props.pageId
    ? `pagesPages-${props.pageId}`
    : null
)

let collabLocalizedContent: any = null

// Set up localized content sync
try {
  // @ts-expect-error - useCollabLocalizedContent may not exist
  if (typeof useCollabLocalizedContent === 'function') {
    // @ts-expect-error - conditional call
    collabLocalizedContent = useCollabLocalizedContent({
      roomId: collabRoomIdForContent.value,
      roomType: 'pagesPages',
      fieldPrefix: 'content',
      user: getCurrentUser()
    })
  }
} catch {
  // Collab package not installed
}

// Collab connection for CroutonI18nInput
const collabForI18n = computed(() => {
  if (!collabLocalizedContent || !collabRoomIdForContent.value) return undefined
  if (!collabLocalizedContent.connected?.value) return undefined
  return {
    getXmlFragment: (locale: string) => collabLocalizedContent.getXmlFragment(locale),
    getContentJson: (locale: string) => collabLocalizedContent.getContentJson(locale),
    setContentJson: (locale: string, content: unknown, force?: boolean) => collabLocalizedContent.setContentJson(locale, content, force),
    connection: collabLocalizedContent.connection,
    user: getCurrentUser()
  }
})

// Fetch all pages for parent selector
const { items: allPages, pending: pagesPending } = await useCollectionQuery('pagesPages')

// Default values for new pages
const defaultValue = {
  pageType: 'pages:regular',
  config: {},
  status: 'draft',
  visibility: 'public',
  showInNavigation: true,
  layout: 'default',
  parentId: null,
  order: 0,
  translations: {},
  ogImage: '',
  robots: 'index'
}

// Form state
const state = ref<typeof defaultValue & { id?: string | null }>({ ...defaultValue })

// Sync title/slug to ghost page in sidebar during creation
const { updateGhost } = useGhostPage()
watch(
  () => {
    const t = state.value.translations as Record<string, { title?: string, slug?: string }> | undefined
    if (!t) return null
    // Use current locale, fall back to first available
    const localeData = t[locale.value] || Object.values(t)[0]
    return { title: localeData?.title, slug: localeData?.slug }
  },
  (val) => {
    if (action.value === 'create' && val) {
      updateGhost({
        title: val.title || 'New page...',
        slug: val.slug || ''
      })
    }
  },
  { deep: true }
)

// Auto-fill slug from title while typing (create mode only)
// Tracks last auto-generated slug per locale so manual edits are respected
const lastAutoSlug = reactive<Record<string, string>>({})

if (!props.pageId) {
  watchDebounced(
    () => {
      const t = state.value.translations as Record<string, { title?: string }> | undefined
      if (!t) return {} as Record<string, string>
      return Object.fromEntries(
        Object.entries(t).map(([loc, data]) => [loc, data?.title || ''])
      )
    },
    (titles: Record<string, string>) => {
      const translations = state.value.translations as Record<string, Record<string, unknown>>
      if (!translations) return

      for (const [loc, title] of Object.entries(titles)) {
        if (!title) continue
        const currentSlug = (translations[loc]?.slug as string) || ''
        const wasAutoFilled = currentSlug === '' || currentSlug === lastAutoSlug[loc]

        if (wasAutoFilled) {
          const newSlug = slugify(title)
          if (!translations[loc]) translations[loc] = {}
          translations[loc].slug = newSlug
          lastAutoSlug[loc] = newSlug
        }
      }
    },
    { debounce: 300, deep: true }
  )
}

// Track content ready state
const contentReady = ref(action.value === 'create')

// Load page data when pageId changes
watch(
  () => props.pageId,
  async (newId) => {
    if (!newId) {
      // Create mode - reset to defaults, pre-fill parentId if provided
      state.value = { ...defaultValue, parentId: props.defaultParentId ?? null }
      contentReady.value = true
      loadError.value = null
      return
    }

    // Update mode - fetch page data
    isLoading.value = true
    loadError.value = null

    try {
      const route = useRoute()
      const { getTeamId } = useTeamContext()
      const teamId = getTeamId()

      if (!teamId) {
        throw new Error('Team context required')
      }

      const response = await $fetch<any>(`/api/teams/${teamId}/${apiPath}`, {
        method: 'GET',
        query: { ids: newId },
        credentials: 'include'
      })

      const pageData = response?.items?.[0] || response?.[0] || response
      if (!pageData) {
        throw new Error('Page not found')
      }

      state.value = { ...defaultValue, ...pageData }

      // Reconstruct translations from root-level fields when API returns flat data
      if (!pageData.translations || Object.keys(pageData.translations).length === 0) {
        state.value.translations = {
          [locale.value || 'en']: {
            title: pageData.title || '',
            slug: pageData.slug || '',
            seoTitle: pageData.seoTitle || '',
            seoDescription: pageData.seoDescription || '',
            content: pageData.content || ''
          }
        }
      }

      contentReady.value = false

      // Initialize collab content if available
      if (collabLocalizedContent && pageData.translations) {
        const translations = pageData.translations as Record<string, { content?: string }>

        watch(
          () => collabLocalizedContent?.synced?.value,
          (synced) => {
            if (synced) {
              for (const [loc, data] of Object.entries(translations)) {
                if (data?.content) {
                  try {
                    const contentJson = typeof data.content === 'string'
                      ? JSON.parse(data.content)
                      : data.content
                    collabLocalizedContent.setContentJson(loc, contentJson)
                  } catch {
                    // Failed to parse content
                  }
                }
              }
              contentReady.value = true
            }
          },
          { immediate: true }
        )
      } else {
        contentReady.value = true
      }
    } catch (error: any) {
      loadError.value = error.message || 'Failed to load page'
      console.error('Failed to load page:', error)
    } finally {
      isLoading.value = false
    }
  },
  { immediate: true }
)

// Computed values
const selectedPageType = computed(() => getPageType(state.value.pageType))
const isRegularPage = computed(() =>
  state.value.pageType === 'pages:regular' || state.value.pageType === 'regular'
)

// Collection page type detection (publishable item pages — e.g. bookings:bookingsLocations-detail)
const isCollectionPage = computed(() => !!selectedPageType.value?.collection)
const collectionPageName = computed(() => selectedPageType.value?.collection || '')

// Collection binder page type detection (pages:collection-binder)
const isBinderPage = computed(() => selectedPageType.value?.fullId === 'pages:collection-binder')

// Which collection the binder wraps (stored in config.collection)
const binderCollection = computed({
  get: () => (state.value.config as any)?.collection as string | null || null,
  set: (val: string | null) => {
    state.value.config = { ...state.value.config, collection: val }
  }
})

// Binder sort config
const binderSortField = computed({
  get: () => (state.value.config as any)?.sortField as string || '',
  set: (val: string) => {
    state.value.config = { ...state.value.config, sortField: val || null }
  }
})

const binderSortOrder = computed({
  get: () => (state.value.config as any)?.sortOrder as string || 'asc',
  set: (val: string) => {
    state.value.config = { ...state.value.config, sortOrder: val }
  }
})

// Available collections for the binder picker
const collectionOptions = computed(() =>
  Object.keys(collections.configs).map(name => {
    const cfg = collections.getConfig(name)
    return {
      value: name,
      label: cfg?.displayName || cfg?.name || name
    }
  })
)


// Selected collection item ID (stored in page config)
const collectionItemId = computed({
  get: () => (state.value.config as any)?.itemId || null,
  set: (val: string | null) => {
    state.value.config = { ...state.value.config, itemId: val }
  }
})

// Determine label key for the collection item picker using display config
const collectionLabelKey = computed(() => {
  if (!collectionPageName.value) return 'title'
  const config = collections.getConfig(collectionPageName.value)
  return config?.display?.title || 'title'
})

// Auto-populate page title when a collection item is selected
// Note: using watch + $fetch instead of useFetch to avoid Nuxt 4 behavior where
// returning null from a useFetch URL function fetches "null" as a relative URL
// (e.g. /admin/team/null), causing a spurious 404 on initial mount.
const { getTeamId: getTeamIdForItem } = useTeamContext()
const selectedCollectionItem = ref<Record<string, any> | null>(null)

watch(
  [isCollectionPage, collectionItemId, collectionPageName],
  async ([isCollection, itemId, colName]) => {
    if (!isCollection || !itemId) {
      selectedCollectionItem.value = null
      return
    }
    const teamId = getTeamIdForItem()
    const config = collections.getConfig(colName)
    if (!teamId || !config?.apiPath) {
      selectedCollectionItem.value = null
      return
    }
    try {
      const response = await $fetch<any>(`/api/teams/${teamId}/${config.apiPath}`, {
        query: { ids: itemId },
        credentials: 'include'
      })
      const items = response?.items || response
      selectedCollectionItem.value = Array.isArray(items) ? (items[0] || null) : items
    } catch {
      selectedCollectionItem.value = null
    }
  },
  { immediate: false }
)

// When a collection item is selected, auto-populate page title, slug, and SEO fields
watch(selectedCollectionItem, (item: Record<string, any> | null) => {
  if (!item || !isCollectionPage.value) return

  const config = collections.getConfig(collectionPageName.value)
  const titleField = config?.display?.title || 'title'
  const descriptionField = config?.display?.description
  const imageField = config?.display?.image
  // For translatable collections the root title may be empty — fall back to translations
  const currentLocaleCode = locale.value || 'en'
  const itemTranslations = item.translations as Record<string, Record<string, string>> | undefined
  const itemTitle = item[titleField]
    || itemTranslations?.[currentLocaleCode]?.[titleField]
    || itemTranslations?.en?.[titleField]
    || item.name
    || item.title

  if (itemTitle) {
    const translations = { ...state.value.translations } as Record<string, { title?: string; slug?: string; seoTitle?: string; seoDescription?: string }>
    const currentLocale = locale.value || 'en'

    // Only auto-populate if title is empty
    if (!translations[currentLocale]) {
      translations[currentLocale] = {}
    }
    if (!translations[currentLocale].title) {
      translations[currentLocale].title = itemTitle
      translations[currentLocale].slug = slugify(itemTitle)
      // Auto-fill SEO title from item title
      translations[currentLocale].seoTitle = itemTitle
      // Auto-fill SEO description from display.description field
      if (descriptionField && item[descriptionField]) {
        translations[currentLocale].seoDescription = String(item[descriptionField]).slice(0, 160)
      }
      state.value.translations = translations
    }

    // Auto-fill ogImage from display.image field
    if (imageField && item[imageField] && !state.value.ogImage) {
      state.value.ogImage = item[imageField]
    }
  }
})

// Page type options
const pageTypeDropdownItems = computed(() => [
  pageTypes.value.map(type => ({
    label: type.name,
    icon: type.icon,
    onSelect: () => { state.value.pageType = type.fullId }
  }))
])

// Status config
const statusConfig: Record<string, { color: string; icon: string; label: string }> = {
  draft: { color: 'warning', icon: 'i-lucide-pencil', label: t('pages.status.draft') || 'Draft' },
  published: { color: 'success', icon: 'i-lucide-check', label: t('pages.status.published') || 'Published' },
  archived: { color: 'error', icon: 'i-lucide-archive', label: t('pages.status.archived') || 'Archived' }
}

const statusDropdownItems = computed(() => [
  Object.entries(statusConfig).map(([status, config]) => ({
    label: config.label,
    slot: status as 'draft' | 'published' | 'archived',
    onSelect: () => { state.value.status = status }
  }))
])

// Visibility config
const visibilityConfig: Record<string, { icon: string; label: string }> = {
  public: { icon: 'i-lucide-globe', label: t('pages.visibility.public') || 'Public' },
  members: { icon: 'i-lucide-users', label: t('pages.visibility.members') || 'Members Only' },
  hidden: { icon: 'i-lucide-eye-off', label: t('pages.visibility.hidden') || 'Hidden' }
}

const visibilityDropdownItems = computed(() => [
  Object.entries(visibilityConfig).map(([visibility, config]) => ({
    label: config.label,
    slot: visibility as 'public' | 'members' | 'hidden',
    onSelect: () => { state.value.visibility = visibility }
  }))
])

// Layout options
const layoutOptions = [
  { value: 'default', label: t('pages.layout.default') || 'Default (Scrollable)' },
  { value: 'full-height', label: t('pages.layout.fullHeight') || 'Full Height (Fixed)' },
  { value: 'full-screen', label: t('pages.layout.fullScreen') || 'Full Screen (No Padding)' }
]

// Robots options for SEO
const robotsOptions = [
  { value: 'index', label: t('pages.robots.index') || 'Allow indexing' },
  { value: 'noindex', label: t('pages.robots.noindex') || 'No indexing' }
]

// Parent page options
const parentOptions = computed(() => {
  const options: { value: string | null; label: string; disabled?: boolean }[] = [
    { value: null, label: t('pages.parent.root') || 'Root (No Parent)' }
  ]

  const pages = allPages.value
  if (!pages || pages.length === 0) return options

  const getDescendantIds = (pageId: string): Set<string> => {
    const descendants = new Set<string>()
    const findDescendants = (parentId: string) => {
      for (const page of pages) {
        if (page.parentId === parentId) {
          descendants.add(page.id)
          findDescendants(page.id)
        }
      }
    }
    findDescendants(pageId)
    return descendants
  }

  const currentId = state.value.id
  const excludeIds = currentId ? getDescendantIds(currentId) : new Set<string>()
  if (currentId) excludeIds.add(currentId)

  const buildOptions = (parentId: string | null = null, depth: number = 0) => {
    const children = pages.filter((p: any) => p.parentId === parentId)
    for (const page of children) {
      const isExcluded = excludeIds.has(page.id)
      options.push({
        value: page.id,
        label: `${'— '.repeat(depth)}${page.title || page.slug || 'Untitled'}`,
        disabled: isExcluded
      })
      buildOptions(page.id, depth + 1)
    }
  }

  buildOptions(null, 0)
  return options
})

// Track manual layout changes
const layoutManuallyChanged = ref(false)

// Auto-set layout based on pageType
watch(() => state.value.pageType, (newPageType) => {
  if (action.value === 'create' && !layoutManuallyChanged.value) {
    const pageType = getPageType(newPageType)
    state.value.layout = pageType?.preferredLayout || 'default'
  }
}, { immediate: true })

function onLayoutChange() {
  layoutManuallyChanged.value = true
}

// Form submission
async function handleSubmit() {
  isSaving.value = true
  try {
    let translations = { ...state.value.translations } as Record<string, { title?: string; slug?: string; content?: string }>

    // Extract collab content
    if (collabLocalizedContent && isRegularPage.value) {
      const activeFragments = collabLocalizedContent.getActiveFragments()
      for (const { locale: loc } of activeFragments) {
        const contentJson = collabLocalizedContent.getContentJson(loc)
        if (!translations[loc]) {
          translations[loc] = {}
        }
        translations[loc] = {
          ...translations[loc],
          content: JSON.stringify(contentJson)
        }
      }
    }

    // Validate title
    const hasTitle = Object.values(translations).some(
      (t) => t?.title && t.title.trim().length > 0
    )
    if (!hasTitle) {
      const notify = useNotify()
      notify.error('Title required', { description: 'Please enter a title for at least one language' })
      return
    }

    // Auto-generate slugs
    for (const [loc, data] of Object.entries(translations)) {
      if (data?.title && (!data?.slug || data.slug.trim() === '')) {
        translations[loc] = {
          ...data,
          slug: slugify(data.title)
        }
      }
      // Block editor emits TipTap JSON objects — stringify for the text column
      if (data?.content && typeof data.content === 'object') {
        translations[loc] = { ...translations[loc], content: JSON.stringify(data.content) }
      }
    }

    // Flatten primary locale's translations to root-level fields for the API
    // The database has flat title/slug/content columns — no translations column
    const primaryLocale = Object.keys(translations)[0] || 'en'
    const primary = translations[primaryLocale] || {}

    const rawContent = isRegularPage.value ? (primary.content || state.value.content) : state.value.content
    const submitData = {
      ...state.value,
      title: primary.title || state.value.title,
      slug: primary.slug || state.value.slug,
      seoTitle: primary.seoTitle || '',
      seoDescription: primary.seoDescription || '',
      content: rawContent && typeof rawContent === 'object' ? JSON.stringify(rawContent) : rawContent,
      translations,
      config: !isRegularPage.value ? state.value.config : null
    }

    let savedPage: any

    if (action.value === 'create') {
      savedPage = await create(submitData)
    } else if (state.value.id) {
      savedPage = await update(state.value.id, submitData)
    }

    // Refresh metadata locally after update
    if (action.value === 'update') {
      const currentUser = getCurrentUser()
      const s = state.value as any
      s.updatedAt = Date.now()
      s.updatedByUser = { name: currentUser.name }
    }

    emit('save', savedPage || submitData)
  } catch (error) {
    console.error('Form submission failed:', error)
  } finally {
    isSaving.value = false
  }
}

// Delete handler — two-click confirm pattern
const confirmingDelete = ref(false)
let deleteResetTimer: ReturnType<typeof setTimeout> | null = null

function handleDelete() {
  if (!state.value.id) return

  if (!confirmingDelete.value) {
    confirmingDelete.value = true
    deleteResetTimer = setTimeout(() => {
      confirmingDelete.value = false
    }, 3000)
    return
  }

  // Second click — actually delete
  const id = state.value.id
  if (deleteResetTimer) clearTimeout(deleteResetTimer)
  confirmingDelete.value = false
  deleteItems([id]).then(() => {
    emit('delete', id)
  })
}

// Translatable fields
const translatableFields = computed(() => {
  if (isRegularPage.value) {
    return ['title', 'slug', 'seoTitle', 'seoDescription', 'content']
  }
  return ['title', 'slug', 'seoTitle', 'seoDescription']
})

// Field components
const fieldComponents = computed(() => {
  if (isRegularPage.value) {
    return { content: 'CroutonPagesEditorBlockEditorWithPreview' }
  }
  return {}
})

// Field options
const fieldOptions = {
  slug: { transform: 'slug' as const }
}

// Field groups for collapsible sections in the i18n input
const fieldGroups = computed(() => ({
  title: 'Info',
  slug: 'Info',
  seoTitle: 'Extra',
  seoDescription: 'Extra',
  content: 'Content',
}))

// Preview drawer state
const showPreview = ref(false)

// Detect if crouton-assets is installed via its croutonApps registration (set in crouton-assets/app/app.config.ts)
const { hasApp } = useCroutonApps()
const hasAssetsPicker = hasApp('assets')

// Asset ID for the picker (not persisted — just tracks current picker selection)
const selectedOgImageAssetId = ref<string | undefined>()

function handleAssetSelect(asset: Record<string, any>) {
  state.value.ogImage = `/images/${asset.pathname}`
  selectedOgImageAssetId.value = asset.id
}

// Preview locale (for language selector in preview panel)
const previewLocale = ref(locale.value)

// Reset preview locale to current editor locale when preview opens
watch(showPreview, (open) => {
  if (open) previewLocale.value = locale.value
})

// Locales that actually have content (for the language selector)
const availablePreviewLocales = computed(() => {
  const translations = state.value.translations as Record<string, { title?: string; content?: string }> | undefined
  if (!translations) return [locale.value]
  return Object.entries(translations)
    .filter(([, data]) => data?.title || data?.content)
    .map(([loc]) => loc)
})

// Metadata: created/updated info
const createdTimeAgo = useTimeAgo(() => (state.value as any).createdAt)
const updatedTimeAgo = useTimeAgo(() => (state.value as any).updatedAt)
const createdByName = computed(() => (state.value as any).createdByUser?.name || (state.value as any).createdByUser?.email)
const updatedByName = computed(() => (state.value as any).updatedByUser?.name || (state.value as any).updatedByUser?.email)
const hasMetadata = computed(() => action.value === 'update' && ((state.value as any).createdAt || (state.value as any).updatedAt))

// Build a preview page object from current form state
const previewPage = computed(() => {
  const translations = { ...state.value.translations } as Record<string, { title?: string; slug?: string; content?: string }>

  // In collab mode, pull live content from Yjs fragments
  if (collabLocalizedContent && isRegularPage.value) {
    const activeFragments = collabLocalizedContent.getActiveFragments?.() || []
    for (const { locale: loc } of activeFragments) {
      const contentJson = collabLocalizedContent.getContentJson(loc)
      if (!translations[loc]) {
        translations[loc] = {}
      }
      translations[loc] = {
        ...translations[loc],
        content: JSON.stringify(contentJson)
      }
    }
  }

  return {
    id: state.value.id || 'preview',
    teamId: '',
    title: '',
    slug: '',
    pageType: state.value.pageType,
    config: state.value.config,
    status: state.value.status,
    visibility: state.value.visibility,
    showInNavigation: state.value.showInNavigation,
    parentId: state.value.parentId,
    order: state.value.order || 0,
    translations
  }
})

// Build public URL for the current page (used by "Open in public" button)
// Uses locale-prefixed format directly to avoid relying on the redirect route
const publicUrl = computed(() => {
  const teamSlug = teamSlugRef.value
  if (!teamSlug || action.value === 'create') return null
  const translations = state.value.translations as Record<string, { slug?: string }> | undefined
  const slug = translations?.[locale.value]?.slug
    || (translations ? Object.values(translations)[0]?.slug : null)
  if (!slug && slug !== '') return null
  const loc = locale.value || 'en'
  return slug ? `/${teamSlug}/${loc}/${slug}` : `/${teamSlug}/${loc}/`
})

// Expose state for parent components (e.g., InlineEditor live preview)
defineExpose({ state })
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted mb-2" />
        <p class="text-sm text-muted">Loading page...</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="loadError" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <UIcon name="i-lucide-alert-circle" class="size-8 text-error mb-2" />
        <p class="text-sm text-error">{{ loadError }}</p>
        <UButton
          size="sm"
          color="primary"
          variant="soft"
          class="mt-3"
          @click="emit('cancel')"
        >
          Go back
        </UButton>
      </div>
    </div>

    <!-- Form -->
    <UForm
      v-else
      :state="state"
      class="flex flex-col h-full"
      @submit="handleSubmit"
    >
      <!-- Header Bar -->
      <CroutonPagesEditorToolbar
        :action="action"
        :status="state.status"
        :visibility="state.visibility"
        :show-in-navigation="state.showInNavigation"
        :layout="state.layout"
        :parent-id="state.parentId"
        :confirming-delete="confirmingDelete"
        :selected-page-type="selectedPageType"
        :page-type-dropdown-items="pageTypeDropdownItems"
        :status-config="statusConfig"
        :visibility-config="visibilityConfig"
        :status-dropdown-items="statusDropdownItems"
        :visibility-dropdown-items="visibilityDropdownItems"
        :layout-options="layoutOptions"
        :parent-options="parentOptions"
        :pages-pending="pagesPending"
        :is-regular-page="isRegularPage"
        :is-saving="isSaving"
        :show-close="showClose"
        :page-id="state.id"
        :public-url="publicUrl"
        @update:status="state.status = $event"
        @update:visibility="state.visibility = $event"
        @update:show-in-navigation="state.showInNavigation = $event"
        @update:layout="state.layout = $event"
        @update:parent-id="state.parentId = $event"
        @update:confirming-delete="confirmingDelete = $event"
        @show-ai-generator="showAiGenerator = true"
        @show-preview="showPreview = true"
        @layout-change="onLayoutChange"
        @cancel="emit('cancel')"
        @delete="handleDelete"
        @close="emit('close')"
      />

      <!-- Collection item picker — shown above the i18n input so it is always visible -->
      <div v-if="isCollectionPage" class="px-4 pt-4 pb-2 shrink-0 border-b border-default">
        <UFormField
          :label="`Select ${selectedPageType?.name || 'Item'}`"
          name="config.itemId"
        >
          <CroutonFormReferenceSelect
            v-model="collectionItemId"
            :collection="collectionPageName"
            :label="selectedPageType?.name"
            :label-key="collectionLabelKey"
          />
        </UFormField>
      </div>

      <!-- Collection binder config — pick which collection to bind + sort options -->
      <div v-if="isBinderPage" class="px-4 pt-4 pb-3 shrink-0 border-b border-default space-y-3">
        <UFormField label="Bind Collection" name="config.collection" help="All items from this collection will appear as sub-entries in navigation.">
          <USelect
            v-model="binderCollection"
            :items="collectionOptions"
            value-key="value"
            placeholder="Select a collection..."
            size="sm"
            class="w-full"
          />
        </UFormField>
        <div class="grid grid-cols-2 gap-2">
          <UFormField label="Sort Field" name="config.sortField" help="e.g. title, order">
            <UInput
              v-model="binderSortField"
              placeholder="order"
              size="sm"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Sort Order" name="config.sortOrder">
            <USelect
              v-model="binderSortOrder"
              :items="[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]"
              value-key="value"
              size="sm"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 min-h-0 p-4 overflow-hidden">
        <CroutonI18nInput
          v-if="contentReady"
          :key="contentKey"
          v-model="state.translations"
          :fields="translatableFields"
          :layout="i18nLayout"
          show-ai-translate
          field-type="page"
          :field-components="fieldComponents"
          :field-options="fieldOptions"
          :field-groups="fieldGroups"
          :default-open-groups="['Info', 'Content']"
          :collab="collabForI18n"
          :class="isCollectionPage ? 'min-h-64' : 'h-full'"
        >
          <template #group-extra="{ locale: previewLocale }">
            <USeparator class="mt-3 mb-2" />
            <div class="flex flex-col gap-2">
              <UFormField :label="t('pages.fields.ogImage') || 'Social Image'" name="ogImage">
                <Suspense v-if="hasAssetsPicker">
                  <CroutonAssetsPicker
                    v-model="selectedOgImageAssetId"
                    @select="handleAssetSelect"
                  />
                  <template #fallback>
                    <div class="h-20 rounded-lg border-2 border-dashed border-default animate-pulse" />
                  </template>
                </Suspense>
                <CroutonImageUpload
                  v-else
                  v-model="state.ogImage"
                  size="sm"
                  accept="image/*"
                />
              </UFormField>
              <UFormField :label="t('pages.fields.robots') || 'Search Indexing'" name="robots">
                <USelect
                  v-model="state.robots"
                  :items="robotsOptions"
                  value-key="value"
                  size="sm"
                  class="w-full"
                />
              </UFormField>
            </div>
            <!-- SEO preview for narrow/mobile (hidden on wide screens where secondary column shows it) -->
            <div class="lg:hidden">
              <CroutonPagesEditorSeoPreview
                :team-slug="teamSlugRef"
                :translations="state.translations"
                :og-image="state.ogImage"
                :preview-locale="previewLocale"
              />
            </div>
          </template>
          <template #group-extra-secondary="{ locale: previewLocale }">
            <CroutonPagesEditorSeoPreview
              :team-slug="teamSlugRef"
              :translations="state.translations"
              :og-image="state.ogImage"
              :preview-locale="previewLocale"
            />
          </template>
          <template v-if="hasMetadata" #header>
            <div class="flex items-center gap-3 text-xs text-muted">
              <span v-if="createdByName" class="flex items-center gap-1">
                <UIcon name="i-lucide-user-plus" class="size-3" />
                {{ createdByName }} {{ createdTimeAgo }}
              </span>
              <span v-if="updatedByName && updatedByName !== createdByName" class="flex items-center gap-1">
                <UIcon name="i-lucide-pencil" class="size-3" />
                {{ updatedByName }} {{ updatedTimeAgo }}
              </span>
              <span v-else-if="(state as any).updatedAt && (state as any).updatedAt !== (state as any).createdAt" class="flex items-center gap-1">
                <UIcon name="i-lucide-pencil" class="size-3" />
                Updated {{ updatedTimeAgo }}
              </span>
            </div>
          </template>
        </CroutonI18nInput>
        <div v-else class="h-full flex items-center justify-center">
          <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
        </div>

        <!-- Config fields for app pages -->
        <template v-if="!isRegularPage && !isCollectionPage && selectedPageType?.configSchema?.length">
          <USeparator label="Page Settings" class="my-6" />
          <div class="space-y-4">
            <div v-for="field in selectedPageType.configSchema" :key="field.name" class="text-sm text-muted">
              Config field: {{ field.name }}
            </div>
          </div>
        </template>

        <template v-else-if="!isRegularPage && !isCollectionPage && !selectedPageType?.configSchema?.length">
          <div class="p-4 bg-muted/30 rounded-lg text-center text-sm text-muted mt-6">
            <UIcon name="i-lucide-info" class="size-5 mb-2" />
            <p>This page type has no additional configuration.</p>
            <p>The page will display the {{ selectedPageType?.name }} component.</p>
          </div>
        </template>
      </div>
    </UForm>

    <!-- Preview Slideover -->
    <USlideover v-model:open="showPreview" :ui="{ content: 'w-full sm:max-w-2xl lg:max-w-4xl' }">
      <template #content="{ close }">
        <div class="flex flex-col h-full">
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-default">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-eye" class="size-4 text-muted" />
              <span class="text-sm font-medium">
                {{ state.status === 'draft' ? 'Draft Preview' : 'Page Preview' }}
              </span>
              <UBadge
                v-if="state.status === 'draft'"
                color="warning"
                variant="subtle"
                size="xs"
              >
                Draft
              </UBadge>
            </div>

            <div class="flex items-center gap-2">
              <!-- Language selector (shown when multiple locales have content) -->
              <div v-if="availablePreviewLocales.length > 1" class="flex items-center gap-1">
                <UButton
                  v-for="loc in availablePreviewLocales"
                  :key="loc"
                  size="xs"
                  :color="previewLocale === loc ? 'primary' : 'neutral'"
                  :variant="previewLocale === loc ? 'soft' : 'ghost'"
                  class="uppercase font-mono"
                  @click="previewLocale = loc"
                >
                  {{ loc }}
                </UButton>
              </div>

              <UButton
                variant="ghost"
                color="neutral"
                icon="i-lucide-x"
                size="xs"
                @click="close"
              />
            </div>
          </div>

          <!-- Rendered page content -->
          <div class="flex-1 overflow-auto">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <CroutonPagesRenderer :page="previewPage" :locale="previewLocale" />
            </div>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- AI Page Generator Modal -->
    <CroutonPagesAiPageGenerator
      v-model="showAiGenerator"
      :available-locales="availableLocales"
      :current-locale="locale"
      @apply="applyAiContent"
    />
  </div>
</template>
