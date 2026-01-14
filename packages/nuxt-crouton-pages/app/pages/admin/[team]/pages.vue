<script setup lang="ts">
/**
 * Admin Pages Management
 *
 * Uses CroutonCollection with tree layout for hierarchical page management.
 * Supports drag-drop reordering and page type selection on create.
 */
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'team-admin']
})

const { t } = useT()
const route = useRoute()
const { getPageType, pageTypes } = usePageTypes()

// Team context
const team = computed(() => route.params.team as string)

// Modal state for creating new pages
const showCreateModal = ref(false)
const selectedPageType = ref('core:regular')
const createStep = ref<'type' | 'form'>('type')

// Reset create modal state
function openCreateModal() {
  selectedPageType.value = 'core:regular'
  createStep.value = 'type'
  showCreateModal.value = true
}

function handleTypeSelected() {
  createStep.value = 'form'
}

function handleCreateClose() {
  showCreateModal.value = false
  createStep.value = 'type'
}

// Get display info for a page type
function getPageTypeDisplay(pageType: string) {
  const type = getPageType(pageType)
  return {
    name: type?.name || 'Unknown',
    icon: type?.icon || 'i-lucide-file'
  }
}

// Custom columns for the collection
const columns = [
  {
    key: 'title',
    label: t('pages.title') || 'Title',
    sortable: true
  },
  {
    key: 'slug',
    label: t('pages.slug') || 'Slug'
  },
  {
    key: 'pageType',
    label: t('pages.type') || 'Type'
  },
  {
    key: 'status',
    label: t('pages.status') || 'Status'
  },
  {
    key: 'visibility',
    label: t('pages.visibility') || 'Visibility'
  }
]

// Status badge colors
const statusColors: Record<string, string> = {
  draft: 'warning',
  published: 'success',
  archived: 'neutral'
}

// Visibility icons
const visibilityIcons: Record<string, string> = {
  public: 'i-lucide-globe',
  members: 'i-lucide-users',
  hidden: 'i-lucide-eye-off'
}
</script>

<template>
  <UDashboardPanel grow>
    <UDashboardNavbar :title="t('pages.title') || 'Pages'">
      <template #leading>
        <UIcon name="i-lucide-file-text" class="size-5" />
      </template>

      <template #right>
        <UButton
          color="primary"
          icon="i-lucide-plus"
          @click="openCreateModal"
        >
          {{ t('pages.create') || 'New Page' }}
        </UButton>
      </template>
    </UDashboardNavbar>

    <UDashboardPanelContent>
      <!-- Pages collection with tree layout -->
      <CroutonCollection
        collection="pagesPages"
        layout="tree"
        :columns="columns"
        show-search
        :empty-state="{
          icon: 'i-lucide-file-text',
          title: t('pages.empty') || 'No pages yet',
          description: t('pages.emptyDescription') || 'Create your first page to get started.'
        }"
      >
        <!-- Custom cell renderers -->
        <template #cell-pageType="{ row }">
          <div class="flex items-center gap-2">
            <UIcon
              :name="getPageTypeDisplay(row.pageType).icon"
              class="size-4 text-muted"
            />
            <span class="text-sm">{{ getPageTypeDisplay(row.pageType).name }}</span>
          </div>
        </template>

        <template #cell-status="{ row }">
          <UBadge
            :color="statusColors[row.status] || 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{ row.status }}
          </UBadge>
        </template>

        <template #cell-visibility="{ row }">
          <UTooltip :text="row.visibility">
            <UIcon
              :name="visibilityIcons[row.visibility] || 'i-lucide-eye'"
              class="size-4 text-muted"
            />
          </UTooltip>
        </template>

        <template #cell-slug="{ row }">
          <code class="text-xs bg-muted px-1.5 py-0.5 rounded">
            /{{ team }}/{{ row.slug || '' }}
          </code>
        </template>
      </CroutonCollection>
    </UDashboardPanelContent>

    <!-- Create Page Modal -->
    <UModal v-model="showCreateModal" :ui="{ width: 'max-w-2xl' }">
      <template #content>
        <div class="p-6">
          <!-- Step 1: Select Page Type -->
          <template v-if="createStep === 'type'">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold">
                {{ t('pages.selectType') || 'Select Page Type' }}
              </h2>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="handleCreateClose"
              />
            </div>

            <CroutonPagesAdminPageTypeSelector v-model="selectedPageType" />

            <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-default">
              <UButton
                color="neutral"
                variant="ghost"
                @click="handleCreateClose"
              >
                {{ t('common.cancel') || 'Cancel' }}
              </UButton>
              <UButton
                color="primary"
                @click="handleTypeSelected"
              >
                {{ t('common.continue') || 'Continue' }}
                <UIcon name="i-lucide-arrow-right" class="ml-2" />
              </UButton>
            </div>
          </template>

          <!-- Step 2: Page Form -->
          <template v-else>
            <div class="flex items-center gap-3 mb-6">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-arrow-left"
                size="sm"
                @click="createStep = 'type'"
              />
              <div>
                <h2 class="text-xl font-semibold">
                  {{ t('pages.createNew') || 'Create New Page' }}
                </h2>
                <p class="text-sm text-muted">
                  {{ getPageTypeDisplay(selectedPageType).name }}
                </p>
              </div>
            </div>

            <!-- Use CroutonForm with pre-filled pageType -->
            <CroutonForm
              collection="pagesPages"
              mode="create"
              :initial-data="{ pageType: selectedPageType }"
              @success="handleCreateClose"
              @cancel="handleCreateClose"
            />
          </template>
        </div>
      </template>
    </UModal>
  </UDashboardPanel>
</template>
