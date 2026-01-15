<template>
  <CroutonCollection
    :layout="layout"
    collection="discubotUserMappings"
    :columns="columns"
    :rows="usermappings || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="DiscubotUserMappings"
        :collection="'discubotUserMappings'"
        createButton
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

const { columns } = useDiscubotUserMappings()

const { items: usermappings, pending } = await useCollectionQuery(
  'discubotUserMappings'
)
</script>