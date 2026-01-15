<template>
  <CroutonCollection
    :layout="layout"
    collection="rakimFlowOutputs"
    :columns="columns"
    :rows="flowoutputs || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="RakimFlowOutputs"
        :collection="'rakimFlowOutputs'"
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

const { columns } = useRakimFlowOutputs()

const { items: flowoutputs, pending } = await useCollectionQuery(
  'rakimFlowOutputs'
)
</script>