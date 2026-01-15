<template>
  <CroutonCollection
    :layout="layout"
    collection="discubotFlows"
    :columns="columns"
    :rows="flows || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="DiscubotFlows"
        :collection="'discubotFlows'"
        createButton
      />
    </template>
  </CroutonCollection>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  layout?: any
}>(), {
  layout: 'table'
})

const { columns } = useDiscubotFlows()

const { items: flows, pending } = await useCollectionQuery(
  'discubotFlows'
)
</script>