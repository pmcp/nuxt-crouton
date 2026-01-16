<script setup lang="ts">
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

// Debug logging
console.log('[CroutonPagesForm] mounted with:', {
  action: props.action,
  activeItem: props.activeItem,
  hasId: !!props.activeItem?.id,
  hasTitle: !!props.activeItem?.title,
  hasContent: !!props.activeItem?.content,
  items: props.items
})

const { t } = useT()
const { pageTypes, getPageType } = usePageTypes()
const { create, update, deleteItems } = useCollectionMutation('pagesPages')
const { open, close, loading: croutonLoading } = useCrouton()

// Fetch all pages for parent selector
const { items: allPages, pending: pagesPending } = await useCollectionQuery('pagesPages')

// Default values for new pages
const defaultValue = {
  title: '',
  slug: '',
  pageType: 'pages:regular',
  content: '',
  config: {},
  status: 'draft',
  visibility: 'public',
  showInNavigation: true,
  layout: 'default',
  parentId: null,
  order: 0,
  translations: {}
}

// Initialize form state
// Form only mounts after CroutonFormDynamicLoader loading completes,
// so activeItem should already be populated from the API
const initialValues = props.action === 'update' && props.activeItem?.id
  ? { ...defaultValue, ...props.activeItem }
  : { ...defaultValue }

// Ensure content is a string (database may return parsed JSON object)
if (initialValues.content && typeof initialValues.content === 'object') {
  initialValues.content = JSON.stringify(initialValues.content)
}

const state = ref<typeof defaultValue & { id?: string | null }>(initialValues)

// Computed values
const selectedPageType = computed(() => getPageType(state.value.pageType))
const isRegularPage = computed(() =>
  state.value.pageType === 'pages:regular' || state.value.pageType === 'regular'
)

// Editor content computed - handles object/string conversion
// UEditor with content-type="json" expects objects, but we store as strings in DB
const editorContent = computed({
  get: () => {
    const content = state.value.content
    // Parse JSON string to object for UEditor
    if (typeof content === 'string' && content) {
      try {
        return JSON.parse(content)
      } catch {
        // Not valid JSON, return empty doc
        return { type: 'doc', content: [] }
      }
    }
    // Already an object, return as-is
    if (content && typeof content === 'object') return content
    // Empty content, return empty doc structure
    return { type: 'doc', content: [] }
  },
  set: (value: string | object) => {
    // Always store as string in state (for DB)
    if (typeof value === 'object') {
      state.value.content = JSON.stringify(value)
    } else {
      state.value.content = value
    }
  }
})

// Page type options for dropdown
const pageTypeOptions = computed(() =>
  pageTypes.value.map(type => ({
    value: type.fullId,
    label: type.name,
    icon: type.icon
  }))
)

// Status options
const statusOptions = [
  { value: 'draft', label: t('pages.status.draft') || 'Draft' },
  { value: 'published', label: t('pages.status.published') || 'Published' },
  { value: 'archived', label: t('pages.status.archived') || 'Archived' }
]

// Visibility options
const visibilityOptions = [
  { value: 'public', label: t('pages.visibility.public') || 'Public' },
  { value: 'members', label: t('pages.visibility.members') || 'Members Only' },
  { value: 'hidden', label: t('pages.visibility.hidden') || 'Hidden' }
]

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

// Auto-generate slug from title (only on create, only if not manually edited)
const slugManuallyEdited = ref(!!props.activeItem?.slug)
watch(() => state.value.title, (title) => {
  if (!slugManuallyEdited.value && props.action === 'create') {
    state.value.slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
})

// Form submission
async function handleSubmit() {
  try {
    const data = {
      ...state.value,
      // Only include content for regular pages, config for app pages
      content: isRegularPage.value ? state.value.content : null,
      config: !isRegularPage.value ? state.value.config : null
    }

    if (props.action === 'create') {
      await create(data)
    } else if (props.action === 'update' && state.value.id) {
      await update(state.value.id, data)
    } else if (props.action === 'delete') {
      await deleteItems(props.items)
    }

    close()
  } catch (error) {
    console.error('Form submission failed:', error)
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

// Translatable fields - title and slug for all pages
// Content uses the block editor separately
const translatableFields = computed(() => {
  return ['title', 'slug']
})

// No custom field components needed since we use BlockEditor for content
const fieldComponents = {}
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
        <div class="flex flex-col gap-4 p-1">
          <!-- Page Type Selector -->
          <UFormField :label="t('pages.fields.pageType') || 'Page Type'" name="pageType">
            <USelect
              v-model="state.pageType"
              :items="pageTypeOptions"
              value-key="value"
              :disabled="action === 'update'"
              class="w-full"
            >
              <template #leading>
                <UIcon
                  v-if="selectedPageType?.icon"
                  :name="selectedPageType.icon"
                  class="size-4"
                />
              </template>
            </USelect>
            <p v-if="selectedPageType?.description" class="text-sm text-muted mt-1">
              {{ selectedPageType.description }}
            </p>
          </UFormField>

          <!-- Translatable Title & Slug Fields -->
          <CroutonI18nInput
            v-model="state.translations"
            :fields="translatableFields"
            :default-values="{
              title: state.title || '',
              slug: state.slug || ''
            }"
            show-ai-translate
            field-type="page"
            :field-components="fieldComponents"
            label="Title & URL Slug"
            @update:english="(data: { field: string, value: string }) => {
              if (data.field === 'title') state.title = data.value
              if (data.field === 'slug') {
                state.slug = data.value
                slugManuallyEdited = true
              }
            }"
          />

          <!-- Block Editor for Regular Pages (with Preview) -->
          <UFormField
            v-if="isRegularPage"
            label="Page Content"
            name="content"
            class="mt-4"
          >
            <div class="h-[500px]">
              <ClientOnly>
                <CroutonPagesEditorBlockEditorWithPreview
                  v-model="editorContent"
                  placeholder="Type / to insert a block..."
                  preview-title="Page Preview"
                />
                <template #fallback>
                  <div class="flex items-center justify-center h-full text-muted border border-default rounded-lg">
                    <UIcon name="i-lucide-loader-2" class="size-6 animate-spin" />
                  </div>
                </template>
              </ClientOnly>
            </div>
          </UFormField>

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

      <template #sidebar>
        <div class="flex flex-col gap-4 p-1">
          <!-- Status -->
          <UFormField :label="t('pages.fields.status') || 'Status'" name="status">
            <USelect
              v-model="state.status"
              :items="statusOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <!-- Visibility -->
          <UFormField :label="t('pages.fields.visibility') || 'Visibility'" name="visibility">
            <USelect
              v-model="state.visibility"
              :items="visibilityOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <!-- Show in Navigation -->
          <UFormField :label="t('pages.fields.showInNavigation') || 'Show in Navigation'" name="showInNavigation">
            <USwitch v-model="state.showInNavigation" />
          </UFormField>

          <!-- Layout -->
          <UFormField :label="t('pages.fields.layout') || 'Layout'" name="layout">
            <USelect
              v-model="state.layout"
              :items="layoutOptions"
              value-key="value"
              class="w-full"
              @update:model-value="onLayoutChange"
            />
            <p class="text-xs text-muted mt-1">
              {{ state.layout === 'full-height' ? 'Content fills the viewport height' : state.layout === 'full-screen' ? 'No padding, full viewport' : 'Normal scrollable content' }}
            </p>
          </UFormField>

          <!-- Parent Page -->
          <UFormField :label="t('pages.fields.parent') || 'Parent Page'" name="parentId">
            <USelect
              v-model="state.parentId"
              :items="parentOptions"
              value-key="value"
              :loading="pagesPending"
              placeholder="Select parent page..."
              class="w-full"
            />
            <p class="text-xs text-muted mt-1">
              {{ state.parentId ? 'This page will be nested under the selected parent' : 'This page will appear at the root level' }}
            </p>
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center gap-2 w-full">
          <!-- Save button -->
          <CroutonFormActionButton
            :action="action"
            :collection="collection"
            :items="items"
            :loading="loading"
            class="flex-1"
          />

          <!-- Delete button (only on update) -->
          <UTooltip v-if="action === 'update' && state.id" text="Delete page">
            <UButton
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              size="md"
              @click="openDeleteConfirm"
            />
          </UTooltip>
        </div>
      </template>
    </CroutonFormLayout>
  </UForm>
</template>
