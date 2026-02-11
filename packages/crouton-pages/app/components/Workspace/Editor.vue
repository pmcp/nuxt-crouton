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
const { pageTypes, getPageType } = usePageTypes()
const { create, update, deleteItems } = useCollectionMutation('pagesPages')
const { locale } = useI18n()
const collections = useCollections()

// Get API path from collection config
const collectionConfig = collections.getConfig('pagesPages')
const apiPath = collectionConfig?.apiPath || 'pages-pages'

// Component state
const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref<string | null>(null)

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
  translations: {}
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
      const toast = useToast()
      toast.add({
        title: 'Title required',
        description: 'Please enter a title for at least one language',
        color: 'error'
      })
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

    let savedPage: any

    if (action.value === 'create') {
      savedPage = await create(submitData)
    } else if (state.value.id) {
      savedPage = await update(state.value.id, submitData)
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
    return ['title', 'slug', 'content']
  }
  return ['title', 'slug']
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

// Preview drawer state
const showPreview = ref(false)

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
       <div class="flex flex-wrap items-center gap-3 min-h-12 px-4 py-2 border-b border-default bg-elevated/30">
        <!-- Status, Page Type, Visibility -->
        <UFieldGroup>
          <!-- Status -->
          <UDropdownMenu
            :items="statusDropdownItems"
            :content="{ align: 'start' }"
          >
            <UButton variant="ghost" color="neutral" size="xs" class="px-2">
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

          <!-- Page Type -->
          <UDropdownMenu
            v-if="action === 'create'"
            :items="pageTypeDropdownItems"
            :content="{ align: 'start' }"
          >
            <UButton variant="ghost" color="neutral" size="xs" class="px-2">
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
            <UButton variant="ghost" color="neutral" size="xs" class="px-2">
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

          <!-- Visibility -->
          <UDropdownMenu
            :items="visibilityDropdownItems"
            :content="{ align: 'start' }"
          >
            <UButton variant="ghost" color="neutral" size="xs" class="px-2">
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

          <!-- Show in Navigation -->
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

          <!-- Settings -->
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

        <div class="flex-1" />

        <!-- Preview -->
        <UTooltip :text="state.status === 'draft' ? 'Preview Draft' : 'Preview Page'" :delay-duration="0">
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-eye"
            size="xs"
            @click="showPreview = true"
          />
        </UTooltip>

        <!-- Cancel (create mode) -->
        <UButton
          v-if="action === 'create'"
          color="error"
          variant="ghost"
          icon="i-lucide-x"
          size="xs"
          @click="emit('cancel')"
        >
          Cancel
        </UButton>

        <!-- Delete (two-click confirm, edit mode) -->
        <UButton
          v-if="action === 'update' && state.id"
          color="error"
          :variant="confirmingDelete ? 'soft' : 'ghost'"
          :icon="confirmingDelete ? undefined : 'i-lucide-trash-2'"
          size="xs"
          @click="handleDelete"
          @blur="confirmingDelete = false"
        >
          <template v-if="confirmingDelete">Delete?</template>
        </UButton>

        <!-- Save -->
        <UButton
          type="submit"
          variant="soft"
          color="primary"
          size="xs"
          icon="i-lucide-save"
          :loading="isSaving"
        >
          {{ action === 'create' ? 'Create' : 'Save' }}
        </UButton>

        <!-- Close button (shown in inline editor context) -->
        <UButton
          v-if="showClose"
          variant="ghost"
          color="neutral"
          icon="i-lucide-x"
          size="xs"
          @click="emit('close')"
        />
      </div>

      <!-- Content -->
      <div class="flex-1 min-h-0 overflow-auto p-4">
        <CroutonI18nInput
          v-if="contentReady"
          v-model="state.translations"
          :fields="translatableFields"
          :layout="i18nLayout"
          show-ai-translate
          field-type="page"
          :field-components="fieldComponents"
          :field-options="fieldOptions"
          :collab="collabForI18n"
          class="h-full"
        />
        <div v-else class="h-full flex items-center justify-center">
          <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
        </div>

        <!-- Config fields for app pages -->
        <template v-if="!isRegularPage && selectedPageType?.configSchema?.length">
          <USeparator label="Page Settings" class="my-6" />
          <div class="space-y-4">
            <div v-for="field in selectedPageType.configSchema" :key="field.name" class="text-sm text-muted">
              Config field: {{ field.name }}
            </div>
          </div>
        </template>

        <template v-else-if="!isRegularPage && !selectedPageType?.configSchema?.length">
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
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-x"
              size="xs"
              @click="close"
            />
          </div>

          <!-- Rendered page content -->
          <div class="flex-1 overflow-auto">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <CroutonPagesRenderer :page="previewPage" />
            </div>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
