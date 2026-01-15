<template>
  <CroutonCollection
    :layout="layout"
    collection="rakimTasks"
    :columns="columns"
    :rows="tasks || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="RakimTasks"
        :collection="'rakimTasks'"
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
    <template #syncJobId-cell="{ row }">
      <CroutonItemCardMini
        v-if="row.original.syncJobId"
        :id="row.original.syncJobId"
        collection="rakimJobs"
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

const { columns } = useRakimTasks()

const { items: tasks, pending } = await useCollectionQuery(
  'rakimTasks'
)
</script>