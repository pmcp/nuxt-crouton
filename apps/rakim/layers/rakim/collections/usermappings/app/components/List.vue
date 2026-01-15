<template>
  <CroutonCollection
    :layout="layout"
    collection="rakimUserMappings"
    :columns="columns"
    :rows="usermappings || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="RakimUserMappings"
        :collection="'rakimUserMappings'"
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

const { columns } = useRakimUserMappings()

const { items: usermappings, pending } = await useCollectionQuery(
  'rakimUserMappings'
)
</script>