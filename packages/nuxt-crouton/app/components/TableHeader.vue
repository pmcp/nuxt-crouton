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
const { open } = useCrouton()

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
  console.log('[TableHeader] Create button clicked')
  console.log('[TableHeader] Collection:', props.collection)
  console.log('[TableHeader] Create button prop value:', props.createButton)
  open('create', props.collection)
  console.log('[TableHeader] open() function called')
}
</script>
