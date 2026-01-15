<template>
  <CroutonCollection
    :layout="layout"
    collection="discubotFlowOutputs"
    :columns="columns"
    :rows="flowoutputs || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="DiscubotFlowOutputs"
        :collection="'discubotFlowOutputs'"
        createButton
      />
    </template>
    <template #flowId-cell="{ row }">
      <CroutonItemCardMini
        v-if="row.original.flowId"
        :id="row.original.flowId"
        collection="discubotFlows"
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

const { columns } = useDiscubotFlowOutputs()

const { items: flowoutputs, pending } = await useCollectionQuery(
  'discubotFlowOutputs'
)
</script>