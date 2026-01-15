<template>
  <CroutonCollection
    :layout="layout"
    collection="discubotInboxMessages"
    :columns="columns"
    :rows="inboxmessages || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="DiscubotInboxMessages"
        :collection="'discubotInboxMessages'"
        createButton
      />
    </template>
    <template #configId-cell="{ row }">
      <CroutonItemCardMini
        v-if="row.original.configId"
        :id="row.original.configId"
        collection="discubotConfigs"
      />
    </template>
    <template #receivedAt-cell="{ row }">
      <CroutonDate :date="row.original.receivedAt"></CroutonDate>
    </template>
    <template #forwardedAt-cell="{ row }">
      <CroutonDate :date="row.original.forwardedAt"></CroutonDate>
    </template>
  </CroutonCollection>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  layout?: any
}>(), {
  layout: 'table'
})

const { columns } = useDiscubotInboxMessages()

const { items: inboxmessages, pending } = await useCollectionQuery(
  'discubotInboxMessages'
)
</script>