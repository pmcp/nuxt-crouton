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

const { t } = useT()
const { pageTypes, getPageType } = usePageTypes()
const { create, update, deleteItems } = useCollectionMutation('pagesPages')
const { open, close, loading: croutonLoading } = useCrouton()

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

const state = ref<typeof defaultValue & { id?: string | null }>(initialValues)

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

function onSlugInput() {
  slugManuallyEdited.value = true
}

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

// Translatable fields for regular pages
const translatableFields = computed(() => {
  if (isRegularPage.value) {
    return ['title', 'content']
  }
  return ['title']
})

// Field components for translations (use editor for content)
const fieldComponents = {
  content: 'CroutonEditorSimple'
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

          <!-- Slug (non-translatable) -->
          <UFormField :label="t('pages.fields.slug') || 'URL Slug'" name="slug" required>
            <UInput
              v-model="state.slug"
              placeholder="page-url-slug"
              class="w-full"
              @input="onSlugInput"
            >
              <template #leading>
                <span class="text-muted text-sm">/</span>
              </template>
            </UInput>
          </UFormField>

          <!-- Translatable Fields (title, content for regular pages) -->
          <CroutonI18nInput
            v-model="state.translations"
            :fields="translatableFields"
            :default-values="{
              title: state.title || '',
              content: state.content || ''
            }"
            :field-components="fieldComponents"
            label="Content"
            @update:english="(data: { field: string, value: string }) => {
              if (data.field === 'title') state.title = data.value
              if (data.field === 'content') state.content = data.value
            }"
          />

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
