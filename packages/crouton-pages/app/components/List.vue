<script setup lang="ts">
/**
 * CroutonPagesList — Convenience wrapper for the pages collection.
 *
 * Uses tree layout by default since pages are hierarchical.
 * The workspace view (admin/[team]/workspace.vue) is the primary admin UI;
 * this component is for embedding a pages list outside the workspace.
 */
const props = withDefaults(defineProps<{
  layout?: 'tree' | 'list' | 'grid' | 'table'
}>(), {
  layout: 'tree'
})

const { columns } = usePagesPages()

const { items: pages, pending } = await useCollectionQuery('pagesPages')
</script>

<template>
  <CroutonCollection
    :layout="layout"
    collection="pagesPages"
    :columns="columns"
    :rows="pages || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="Pages"
        collection="pagesPages"
        createButton
      />
    </template>
  </CroutonCollection>
</template>
