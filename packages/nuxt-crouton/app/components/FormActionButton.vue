<template>
  <UButton
    :loading="loading !== 'notLoading'"
    :disabled="loading !== 'notLoading'"
    size="lg"
    block
    :color="action === 'delete' ? 'red' : 'primary'"
    type="submit"
  >
    <div class="flex items-center gap-1">
      <span class="capitalize">{{ action }}</span><span class="lowercase">{{ collectionWithCapitalSingular(collection) }}</span>
    </div>
  </UButton>
</template>

<script setup>
const { collectionWithCapitalSingular } = useFormatCollections()

const props = defineProps({
  action: {
    type: String,
    required: true
  },
  collection: {
    type: String,
    required: true
  },
  items: {
    type: Array,
    default: []
  },
  loading: {
    type: String,
    default: ''
  }
})
</script>
