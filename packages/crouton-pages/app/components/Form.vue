<script setup lang="ts">
// slugify is auto-imported from @fyit/crouton/app/utils/slugify.ts via Nuxt layers

/**
 * Pages Collection Form
 *
 * Custom form for creating/editing pages with:
 * - Page type selector dropdown that changes available fields
 * - Translatable fields (title, content) via CroutonI18nInput
 * - Rich text editor for content field
 * - Config fields for app-specific page types
 *
 * This component is registered via app.config.ts as the form for pagesPages collection.
 * Consuming apps can override by providing their own componentName.
 */

interface Props {
  collection?: string
  loading?: string
  action?: 'create' | 'update' | 'delete' | 'view'
  items?: any[]
  activeItem?: Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  collection: 'pagesPages',
  action: 'create',
  items: () => [],
  activeItem: () => ({})
})

const { t } = useT()
const { pageTypes, getPageType } = usePageTypes()
const { create, update, deleteItems } = useCollectionMutation('pagesPages')
const { open, close, loading: croutonLoading } = useCrouton()

// Local saving state for spinner
const isSaving = ref(false)

// Get current user for collab (content sync)
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
          color: undefined // Let collab generate consistent color from ID
        }
      }
    }
  } catch {
    // Auth package not installed
  }
  return { name: 'Anonymous', color: undefined }
}

// Set up collab if package is installed
// Must be called at top level for composable compatibility (Vue's rules)
// Pass null roomId for create action - composable handles null gracefully
const collabRoomIdForContent = props.action === 'update' && props.activeItem?.id
  ? `pagesPages-${props.activeItem.id}`
  : null

let collabLocalizedContent: any = null

// Note: Presence tracking is handled by the base CroutonForm component
// which shows CollabEditingBadge in the slideover header

// Set up localized content sync (real-time editing per locale)
// Always call at top level - pass null roomId for create action
try {
  // @ts-expect-error - useCollabLocalizedContent may not exist if collab package not installed
  if (typeof useCollabLocalizedContent === 'function') {
    // @ts-expect-error - conditional call
    collabLocalizedContent = useCollabLocalizedContent({
      roomId: collabRoomIdForContent,
      roomType: 'pagesPages',
      fieldPrefix: 'content',
      user: getCurrentUser()
    })
  }
} catch {
  // Collab package not installed
}

// Collab connection for CroutonI18nInput (provides getXmlFragment, getContentJson, setContentJson for block editors)
const collabForI18n = computed(() => {
  if (!collabLocalizedContent || !collabRoomIdForContent) return undefined
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
// Note: title, slug, content are all stored in translations.{locale}
const defaultValue = {
  pageType: 'pages:regular',
  config: {},
  status: 'draft',
  visibility: 'public',
  showInNavigation: true,
  layout: 'default',
  parentId: null,
  order: 0,
  translations: {} // { en: { title, slug, content }, nl: { ... }, ... }
}

// Initialize form state
// Form only mounts after CroutonFormDynamicLoader loading completes,
// so activeItem should already be populated from the API
const initialValues = props.action === 'update' && props.activeItem?.id
  ? { ...defaultValue, ...props.activeItem }
  : { ...defaultValue }

const state = ref<typeof defaultValue & { id?: string | null }>(initialValues)

// Reconstruct translations from root-level fields when API returns flat data
if (props.action === 'update' && props.activeItem?.id) {
  const item = props.activeItem
  if (!item.translations || Object.keys(item.translations).length === 0) {
    const { locale } = useI18n()
    state.value.translations = {
      [locale.value || 'en']: {
        title: item.title || '',
        slug: item.slug || '',
        content: item.content || ''
      }
    }
  }
}

// Track when collab content has been loaded (prevents race condition with Yjs sync)
// Start as true for create action, false for update (will be set true after content loads)
const contentReady = ref(props.action === 'create')

// Initialize Yjs fragments with existing content when editing
// This happens after collab connection is SYNCED (not just connected)
// IMPORTANT: Wait for synced, not just connected, to avoid race condition
// where setContentJson is called while server is still sending initial state
if (collabLocalizedContent && props.action === 'update' && props.activeItem?.translations) {
  const translations = props.activeItem.translations as Record<string, { content?: string }>

  // Wait for collab to SYNC before loading content
  // synced means the server has sent its initial state
  watch(
    () => collabLocalizedContent?.synced?.value,
    (synced) => {
      if (synced) {
        for (const [locale, data] of Object.entries(translations)) {
          if (data?.content) {
            try {
              const contentJson = typeof data.content === 'string'
                ? JSON.parse(data.content)
                : data.content
              collabLocalizedContent.setContentJson(locale, contentJson)
            } catch {
              // Failed to parse content for locale
            }
          }
        }
        // Mark content as ready AFTER all locales loaded
        contentReady.value = true
      }
    },
    { immediate: true }
  )
} else if (props.action === 'update') {
  // No collab content to load for update action, ready immediately
  contentReady.value = true
}

// Computed values
const selectedPageType = computed(() => getPageType(state.value.pageType))
const isRegularPage = computed(() =>
  state.value.pageType === 'pages:regular' || state.value.pageType === 'regular'
)


// Page type options for dropdown
const pageTypeOptions = computed(() =>
  pageTypes.value.map(type => ({
    value: type.fullId,
    label: type.name,
    icon: type.icon
  }))
)

// Page type dropdown items for UDropdownMenu
const pageTypeDropdownItems = computed(() => [
  pageTypes.value.map(type => ({
    label: type.name,
    icon: type.icon,
    onSelect: () => { state.value.pageType = type.fullId }
  }))
])

// Status config with colors
const statusConfig: Record<string, { color: string; icon: string; label: string }> = {
  draft: { color: 'warning', icon: 'i-lucide-pencil', label: t('pages.status.draft') || 'Draft' },
  published: { color: 'success', icon: 'i-lucide-check', label: t('pages.status.published') || 'Published' },
  archived: { color: 'error', icon: 'i-lucide-archive', label: t('pages.status.archived') || 'Archived' }
}

// Status dropdown items for UDropdownMenu
const statusDropdownItems = computed(() => [
  Object.entries(statusConfig).map(([status, config]) => ({
    label: config.label,
    slot: status as 'draft' | 'published' | 'archived',
    onSelect: () => { state.value.status = status }
  }))
])

// Visibility config with icons (no color variation - just different icons)
const visibilityConfig: Record<string, { icon: string; label: string }> = {
  public: { icon: 'i-lucide-globe', label: t('pages.visibility.public') || 'Public' },
  members: { icon: 'i-lucide-users', label: t('pages.visibility.members') || 'Members Only' },
  hidden: { icon: 'i-lucide-eye-off', label: t('pages.visibility.hidden') || 'Hidden' }
}

// Visibility dropdown items for UDropdownMenu
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

// Parent page options - builds tree-structured options from fetched pages
// Filters out current page and its descendants to prevent circular references
const parentOptions = computed(() => {
  const options: { value: string | null; label: string; disabled?: boolean }[] = [
    { value: null, label: t('pages.parent.root') || 'Root (No Parent)' }
  ]

  const pages = allPages.value
  if (!pages || pages.length === 0) {
    return options
  }

  // Get all descendant IDs to exclude (prevent circular references)
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

  // Build flat list with indentation based on depth
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

// Track if layout was manually changed
const layoutManuallyChanged = ref(false)

// Auto-set layout based on pageType's preferredLayout (only on create, only if not manually changed)
watch(() => state.value.pageType, (newPageType) => {
  if (props.action === 'create' && !layoutManuallyChanged.value) {
    const pageType = getPageType(newPageType)
    if (pageType?.preferredLayout) {
      state.value.layout = pageType.preferredLayout
    } else {
      state.value.layout = 'default'
    }
  }
}, { immediate: true })

function onLayoutChange() {
  layoutManuallyChanged.value = true
}

// Note: Auto-slug generation is handled by CroutonI18nInput
// when title changes in a locale, slug for that locale can be auto-generated

// Form submission
async function handleSubmit() {
  isSaving.value = true
  try {
    // Prepare translations, extracting collab content if needed
    let translations = { ...state.value.translations } as Record<string, { title?: string; slug?: string; content?: string }>

    // When collab is active for content, extract from Yjs fragments
    if (collabLocalizedContent && isRegularPage.value) {
      const activeFragments = collabLocalizedContent.getActiveFragments()
      for (const { locale } of activeFragments) {
        const contentJson = collabLocalizedContent.getContentJson(locale)
        if (!translations[locale]) {
          translations[locale] = {}
        }
        translations[locale] = {
          ...translations[locale],
          content: JSON.stringify(contentJson)
        }
      }
    }

    // Validate: At least one locale must have a title
    const hasTitle = Object.values(translations).some(
      (t) => t?.title && t.title.trim().length > 0
    )
    if (!hasTitle) {
      const toast = useToast()
      toast.add({
        title: 'Title required',
        description: 'Please enter a title for at least one language',
        color: 'error'
      })
      return
    }

    // Auto-generate slugs for locales that have title but no slug
    for (const [locale, data] of Object.entries(translations)) {
      if (data?.title && (!data?.slug || data.slug.trim() === '')) {
        translations[locale] = {
          ...data,
          slug: slugify(data.title)
        }
      }
    }

    // Flatten primary locale's translations to root-level fields for the API
    // The database has flat title/slug/content columns — no translations column
    const primaryLocale = Object.keys(translations)[0] || 'en'
    const primary = translations[primaryLocale] || {}

    const submitData = {
      ...state.value,
      title: primary.title || state.value.title,
      slug: primary.slug || state.value.slug,
      content: isRegularPage.value ? (primary.content || state.value.content) : state.value.content,
      translations,
      config: !isRegularPage.value ? state.value.config : null
    }

    if (props.action === 'create') {
      await create(submitData)
    } else if (props.action === 'update' && state.value.id) {
      await update(state.value.id, submitData)
    } else if (props.action === 'delete') {
      await deleteItems(props.items)
    }

    close()
  } catch (error) {
    console.error('Form submission failed:', error)
  } finally {
    isSaving.value = false
  }
}

// Open delete confirmation dialog
function openDeleteConfirm() {
  if (state.value.id) {
    // Close current form and open delete confirmation
    close()
    open('delete', 'pagesPages', [state.value.id])
  }
}

// Translatable fields - title, slug, and content for regular pages
// All content is per-locale (no "base language")
const translatableFields = computed(() => {
  if (isRegularPage.value) {
    return ['title', 'slug', 'content']
  }
  return ['title', 'slug']
})

// Field components - use block editor for content field
const fieldComponents = computed(() => {
  if (isRegularPage.value) {
    return { content: 'CroutonPagesEditorBlockEditorWithPreview' }
  }
  return {}
})

// Field options - enable real-time slug sanitization
const fieldOptions = {
  slug: { transform: 'slug' as const }
}
</script>

<template>
  <!-- Delete confirmation -->
  <CroutonFormActionButton
    v-if="action === 'delete'"
    :action="action"
    :collection="collection"
    :items="items"
    :loading="loading"
    @click="handleSubmit"
  />

  <!-- Create/Update form -->
  <UForm
    v-else
    :state="state"
    @submit="handleSubmit"
  >
    <CroutonFormLayout>
      <template #main>
        <div class="flex flex-col h-full">
          <!-- Compact Header Bar -->
          <div class="flex flex-wrap items-center gap-3 pb-3 mb-4 border-b border-default">
            <!-- Status, Page Type, Visibility & Settings (grouped) -->
            <UFieldGroup>
              <!-- Status Selector (dropdown with colored dots) -->
              <UDropdownMenu
                :items="statusDropdownItems"
                :content="{ align: 'start' }"
              >
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  class="px-2"
                >
                  <span
                    :class="[
                      'block size-3 rounded-full',
                      `bg-${statusConfig[state.status]?.color || 'warning'}`
                    ]"
                  />
                </UButton>

                <template #draft="{ item }">
                  <span class="flex items-center gap-2">
                    <span class="block size-2.5 rounded-full bg-warning" />
                    {{ item.label }}
                  </span>
                </template>
                <template #published="{ item }">
                  <span class="flex items-center gap-2">
                    <span class="block size-2.5 rounded-full bg-success" />
                    {{ item.label }}
                  </span>
                </template>
                <template #archived="{ item }">
                  <span class="flex items-center gap-2">
                    <span class="block size-2.5 rounded-full bg-error" />
                    {{ item.label }}
                  </span>
                </template>
              </UDropdownMenu>

              <!-- Page Type Selector (dropdown on create, popover on edit) -->
              <UDropdownMenu
                v-if="action === 'create'"
                :items="pageTypeDropdownItems"
                :content="{ align: 'start' }"
              >
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  class="px-2"
                >
                  <UIcon
                    :name="selectedPageType?.icon || 'i-lucide-file'"
                    class="size-4"
                  />
                </UButton>

                <template #item="{ item }">
                  <span class="flex items-center gap-2">
                    <UIcon :name="item.icon || 'i-lucide-file'" class="size-4 text-muted" />
                    {{ item.label }}
                  </span>
                </template>
              </UDropdownMenu>
              <UPopover v-else>
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  class="px-2"
                >
                  <UIcon
                    :name="selectedPageType?.icon || 'i-lucide-file'"
                    class="size-4"
                  />
                </UButton>
                <template #content>
                  <div class="p-3 text-sm">
                    <div class="font-medium">{{ selectedPageType?.name || 'Regular Page' }}</div>
                    <div v-if="selectedPageType?.description" class="text-muted text-xs mt-1">
                      {{ selectedPageType.description }}
                    </div>
                  </div>
                </template>
              </UPopover>

              <!-- Visibility Selector (dropdown with icons) -->
              <UDropdownMenu
                :items="visibilityDropdownItems"
                :content="{ align: 'start' }"
              >
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  class="px-2"
                >
                  <UIcon
                    :name="visibilityConfig[state.visibility]?.icon || 'i-lucide-globe'"
                    class="size-4 text-muted"
                  />
                </UButton>

                <template #public="{ item }">
                  <span class="flex items-center gap-2">
                    <UIcon name="i-lucide-globe" class="size-4 text-muted" />
                    {{ item.label }}
                  </span>
                </template>
                <template #members="{ item }">
                  <span class="flex items-center gap-2">
                    <UIcon name="i-lucide-users" class="size-4 text-muted" />
                    {{ item.label }}
                  </span>
                </template>
                <template #hidden="{ item }">
                  <span class="flex items-center gap-2">
                    <UIcon name="i-lucide-eye-off" class="size-4 text-muted" />
                    {{ item.label }}
                  </span>
                </template>
              </UDropdownMenu>

              <!-- Show in Navigation Toggle -->
              <UTooltip :text="state.showInNavigation ? 'Shown in Menu' : 'Hidden from Menu'" :delay-duration="0">
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  class="px-2"
                  @click="state.showInNavigation = !state.showInNavigation"
                >
                  <UIcon
                    name="i-lucide-menu"
                    :class="['size-4', state.showInNavigation ? 'text-muted' : 'opacity-30']"
                  />
                </UButton>
              </UTooltip>

              <!-- Page Settings Popover -->
              <UTooltip text="Settings" :delay-duration="0">
                <UPopover>
                  <UButton
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-settings"
                    size="xs"
                  />
                  <template #content>
                    <div class="p-4 w-72 space-y-4">
                      <div class="text-sm font-medium text-default mb-3">Page Settings</div>

                      <!-- Layout -->
                      <UFormField :label="t('pages.fields.layout') || 'Layout'" name="layout">
                        <USelect
                          v-model="state.layout"
                          :items="layoutOptions"
                          value-key="value"
                          size="sm"
                          class="w-full"
                          @update:model-value="onLayoutChange"
                        />
                      </UFormField>

                      <!-- Parent Page -->
                      <UFormField :label="t('pages.fields.parent') || 'Parent'" name="parentId">
                        <USelect
                          v-model="state.parentId"
                          :items="parentOptions"
                          value-key="value"
                          :loading="pagesPending"
                          placeholder="None"
                          size="sm"
                          class="w-full"
                        />
                      </UFormField>
                    </div>
                  </template>
                </UPopover>
              </UTooltip>
            </UFieldGroup>

            <!-- Spacer -->
            <div class="flex-1" />

            <!-- Note: Collab presence is shown in the slideover header by base CroutonForm -->

            <!-- Delete & Save Buttons (grouped) -->
            <UFieldGroup>
              <!-- Delete Button (update mode only) -->
              <UButton
                v-if="action === 'update' && state.id"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="xs"
                @click="openDeleteConfirm"
              />

              <!-- Save Button -->
              <UButton
                type="submit"
                variant="ghost"
                color="primary"
                size="xs"
                icon="i-lucide-save"
                :loading="isSaving"
              >
                {{ action === 'create' ? 'Create' : 'Save' }}
              </UButton>
            </UFieldGroup>
          </div>

          <!-- Translatable Fields - grows to fill space -->
          <div class="flex-1 min-h-0 overflow-hidden">
            <CroutonI18nInput
              v-if="contentReady"
              v-model="state.translations"
              :fields="translatableFields"
              layout="side-by-side"
              show-ai-translate
              field-type="page"
              :field-components="fieldComponents"
              :field-options="fieldOptions"
              :collab="collabForI18n"
              class="h-full"
            />
            <!-- Loading spinner while collab content initializes -->
            <div v-else class="h-full flex items-center justify-center">
              <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
            </div>
          </div>

          <!-- Config Fields (for app pages with configSchema) -->
          <template v-if="!isRegularPage && selectedPageType?.configSchema?.length">
            <USeparator label="Page Settings" />
            <div class="space-y-4">
              <div v-for="field in selectedPageType.configSchema" :key="field.name" class="text-sm text-muted">
                <!-- TODO: Render config fields based on schema -->
                Config field: {{ field.name }}
              </div>
            </div>
          </template>

          <!-- No config message for app pages without configSchema -->
          <template v-else-if="!isRegularPage && !selectedPageType?.configSchema?.length">
            <div class="p-4 bg-muted/30 rounded-lg text-center text-sm text-muted">
              <UIcon name="i-lucide-info" class="size-5 mb-2" />
              <p>This page type has no additional configuration.</p>
              <p>The page will display the {{ selectedPageType?.name }} component.</p>
            </div>
          </template>

        </div>
      </template>

    </CroutonFormLayout>
  </UForm>
</template>

