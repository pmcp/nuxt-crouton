<script setup lang="ts">
/**
 * Admin Pages Management
 *
 * Uses CroutonCollection with tree layout for hierarchical page management.
 * The Create/Edit forms use the standard Crouton slideover flow with
 * CroutonPagesForm registered via app.config.ts.
 */
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'team-admin']
})

const { t } = useT()
const route = useRoute()
const { getPageType } = usePageTypes()
const crouton = useCrouton()
const { locale } = useI18n()
const { getSlugForLocale } = useLocalizedSlug()

// Team context
const team = computed(() => route.params.team as string)

// Fetch pages data
const { data: pages, pending } = await useCollectionQuery<any>('pagesPages')

// Open create form using standard Crouton flow
function openCreateForm() {
  crouton.open('create', 'pagesPages', [], 'slideover')
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
  { key: 'title', label: 'Title', sortable: true },
  { key: 'slug', label: 'Slug' },
  { key: 'pageType', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'visibility', label: 'Visibility' }
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
          @click="openCreateForm"
        >
          {{ t('pages.create') || 'New Page' }}
        </UButton>
      </template>
    </UDashboardNavbar>

    <div class="flex-1 overflow-auto p-4">
      <div v-if="pending" class="flex items-center gap-2 text-muted">
        <UIcon name="i-lucide-loader-circle" class="animate-spin" />
        Loading...
      </div>

      <CroutonCollection
        v-else
        collection="pagesPages"
        :rows="pages || []"
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
            /{{ team }}/{{ locale }}/{{ getSlugForLocale(row, String(locale)) }}
          </code>
        </template>
      </CroutonCollection>
    </div>
  </UDashboardPanel>
</template>
