<template>
  <CroutonCollection
    :layout="layout"
    collection="rakimConfigs"
    :columns="columns"
    :rows="configs || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="RakimConfigs"
        :collection="'rakimConfigs'"
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

const { columns } = useRakimConfigs()

const { items: configs, pending } = await useCollectionQuery(
  'rakimConfigs'
)
</script>