<template>
  <CroutonCollection
    :layout="layout"
    collection="rakimFlowInputs"
    :columns="columns"
    :rows="flowinputs || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="RakimFlowInputs"
        :collection="'rakimFlowInputs'"
        createButton
      />
    </template>
    <template #flowId-cell="{ row }">
      <CroutonItemCardMini
        v-if="row.original.flowId"
        :id="row.original.flowId"
        collection="rakimFlows"
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

const { columns } = useRakimFlowInputs()

const { items: flowinputs, pending } = await useCollectionQuery(
  'rakimFlowInputs'
)
</script>