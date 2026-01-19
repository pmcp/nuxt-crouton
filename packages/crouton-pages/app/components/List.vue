<script setup lang="ts">
/**
 * Pages Collection List
 *
 * Tree-view list component for the pages collection.
 * Uses CroutonCollection with tree layout and a custom card component.
 *
 * This component is auto-imported as CroutonPagesList.
 */
import { resolveComponent, type Component } from 'vue'

const props = withDefaults(defineProps<{
  layout?: 'tree' | 'table' | 'list' | 'grid'
}>(), {
  layout: 'tree'
})

// Resolve the card component for tree/list/grid layouts
const CroutonPagesCard = resolveComponent('CroutonPagesCard') as Component

// Fetch pages data
const { items: pages, pending } = await useCollectionQuery('pagesPages')

// Get columns from the collection composable
const { columns } = usePagesPages()
</script>

<template>
  <CroutonCollection
    :layout="layout"
    collection="pagesPages"
    :columns="columns"
    :rows="pages || []"
    :loading="pending"
    :card-component="CroutonPagesCard"
    show-collab-presence
    create
  >
    <template #header>
      <CroutonTableHeader
        title="Pages"
        collection="pagesPages"
        create-button
      />
    </template>

    <!-- Custom cell templates for table layout -->
    <template #publishedAt-cell="{ row }">
      <CroutonDate :date="row.original.publishedAt" />
    </template>

    <template #showInNavigation-cell="{ row }">
      <CroutonBoolean :value="row.original.showInNavigation" />
    </template>

    <template #status-cell="{ row }">
      <UBadge
        :color="getStatusColor(row.original.status)"
        size="sm"
        variant="subtle"
      >
        {{ row.original.status }}
      </UBadge>
    </template>

    <template #visibility-cell="{ row }">
      <UBadge
        :color="getVisibilityColor(row.original.visibility)"
        size="sm"
        variant="subtle"
      >
        {{ row.original.visibility || 'public' }}
      </UBadge>
    </template>
  </CroutonCollection>
</template>

<script lang="ts">
// Helper functions defined outside setup for use in template
function getStatusColor(status: string): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'published': return 'success'
    case 'draft': return 'warning'
    case 'archived': return 'neutral'
    default: return 'neutral'
  }
}

function getVisibilityColor(visibility: string): 'info' | 'warning' | 'neutral' {
  switch (visibility) {
    case 'public': return 'info'
    case 'members': return 'warning'
    case 'hidden': return 'neutral'
    default: return 'info'
  }
}
</script>
