<template>
  <CroutonCollection
    :layout="layout"
    collection="discubotDiscussions"
    :columns="columns"
    :rows="discussions || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="DiscubotDiscussions"
        :collection="'discubotDiscussions'"
        createButton
      />
    </template>
    <template #sourceConfigId-cell="{ row }">
      <CroutonItemCardMini
        v-if="row.original.sourceConfigId"
        :id="row.original.sourceConfigId"
        collection="discubotConfigs"
      />
    </template>
    <template #syncJobId-cell="{ row }">
      <CroutonItemCardMini
        v-if="row.original.syncJobId"
        :id="row.original.syncJobId"
        collection="discubotJobs"
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

const { columns } = useDiscubotDiscussions()

const { items: discussions, pending } = await useCollectionQuery(
  'discubotDiscussions'
)
</script>