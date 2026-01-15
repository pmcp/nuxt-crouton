<template>
  <CroutonCollection
    :layout="layout"
    collection="rakimJobs"
    :columns="columns"
    :rows="jobs || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="RakimJobs"
        :collection="'rakimJobs'"
        createButton
      />
    </template>
    <template #discussionId-cell="{ row }">
      <CroutonItemCardMini
        v-if="row.original.discussionId"
        :id="row.original.discussionId"
        collection="rakimDiscussions"
      />
    </template>
    <template #sourceConfigId-cell="{ row }">
      <CroutonItemCardMini
        v-if="row.original.sourceConfigId"
        :id="row.original.sourceConfigId"
        collection="rakimConfigs"
      />
    </template>
    <template #startedAt-cell="{ row }">
      <CroutonDate :date="row.original.startedAt"></CroutonDate>
    </template>
    <template #completedAt-cell="{ row }">
      <CroutonDate :date="row.original.completedAt"></CroutonDate>
    </template>
  </CroutonCollection>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  layout?: any
}>(), {
  layout: 'table'
})

const { columns } = useRakimJobs()

const { items: jobs, pending } = await useCollectionQuery(
  'rakimJobs'
)
</script>