<template>
  <CroutonCollection
    :layout="layout"
    collection="discubotConfigs"
    :columns="columns"
    :rows="configs || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="DiscubotConfigs"
        :collection="'discubotConfigs'"
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

const { columns } = useDiscubotConfigs()

const { items: configs, pending } = await useCollectionQuery(
  'discubotConfigs'
)
</script>