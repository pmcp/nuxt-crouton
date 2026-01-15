<template>
  <CroutonCollection
    :layout="layout"
    collection="discubotJobs"
    :columns="columns"
    :rows="jobs || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="DiscubotJobs"
        :collection="'discubotJobs'"
        createButton
      />
    </template>
    <template #discussionId-cell="{ row }">
      <CroutonItemCardMini
        v-if="row.original.discussionId"
        :id="row.original.discussionId"
        collection="discubotDiscussions"
      />
    </template>
    <template #sourceConfigId-cell="{ row }">
      <CroutonItemCardMini
        v-if="row.original.sourceConfigId"
        :id="row.original.sourceConfigId"
        collection="discubotConfigs"
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

const { columns } = useDiscubotJobs()

const { items: jobs, pending } = await useCollectionQuery(
  'discubotJobs'
)
</script>