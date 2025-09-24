<template>
  <UDashboardNavbar :title="collection || 'Data'">
    <template #left>
      <TypoH2>
        {{ title }}
      </TypoH2>
    </template>
    <template #right>
      <slot name="extraButtons" />
      <UButton
        v-if="createButton"
        color="primary"
        size="md"
        @click="handleCreate"
      >
        <span>Create <span class="hidden md:inline" >{{ useFormatCollections().collectionWithCapitalSingular(collection) }}</span></span>
      </UButton>
    </template>
  </UDashboardNavbar>

</template>
<script setup>
const { open } = useCrud()

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  collection: {
    type: String,
    default: ''
  },
  createButton: {
    type: Boolean,
    default: false
  }
})

const handleCreate = () => {
  open('create', props.collection)
}
</script>
