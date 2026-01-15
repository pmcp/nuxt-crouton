<template>
  <CroutonCollection
    :layout="layout"
    collection="discubotTasks"
    :columns="columns"
    :rows="tasks || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="DiscubotTasks"
        :collection="'discubotTasks'"
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
    <template #syncJobId-cell="{ row }">
      <CroutonItemCardMini
        v-if="row.original.syncJobId"
        :id="row.original.syncJobId"
        collection="discubotJobs"
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

const { columns } = useDiscubotTasks()

const { items: tasks, pending } = await useCollectionQuery(
  'discubotTasks'
)
</script>