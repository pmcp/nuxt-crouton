<template>
  <CroutonCollection
    :layout="layout"
    collection="discubotFlowInputs"
    :columns="columns"
    :rows="flowinputs || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="DiscubotFlowInputs"
        :collection="'discubotFlowInputs'"
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

const { columns } = useDiscubotFlowInputs()

const { items: flowinputs, pending } = await useCollectionQuery(
  'discubotFlowInputs'
)
</script>