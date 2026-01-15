<template>
  <CroutonCollection
    :layout="layout"
    collection="rakimDiscussions"
    :columns="columns"
    :rows="discussions || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="RakimDiscussions"
        :collection="'rakimDiscussions'"
        createButton
      />
    </template>
    <template #sourceConfigId-cell="{ row }">
      <CroutonItemCardMini
        v-if="row.original.sourceConfigId"
        :id="row.original.sourceConfigId"
        collection="rakimConfigs"
      />
    </template>
    <template #syncJobId-cell="{ row }">
      <CroutonItemCardMini
        v-if="row.original.syncJobId"
        :id="row.original.syncJobId"
        collection="rakimJobs"
      />
    </template>
    <template #processedAt-cell="{ row }">
      <CroutonDate :date="row.original.processedAt"></CroutonDate>
    </template>
  </CroutonCollection>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  layout?: any
}>(), {
  layout: 'table'
})

const { columns } = useRakimDiscussions()

const { items: discussions, pending } = await useCollectionQuery(
  'rakimDiscussions'
)
</script>