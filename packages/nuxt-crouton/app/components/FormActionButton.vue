<template>
  <UButton
    :loading="loading !== 'notLoading'"
    :disabled="loading !== 'notLoading'"
    size="lg"
    block
    :color="action === 'delete' ? 'error' : 'primary'"
    :variant="hasValidationErrors ? 'outline' : 'solid'"
    :class="{ 'opacity-50 cursor-not-allowed': hasValidationErrors && loading === 'notLoading' }"
    type="submit"
  >
    <div class="flex items-center gap-2">
      <UIcon
        v-if="hasValidationErrors && loading === 'notLoading'"
        name="i-lucide-triangle-alert"
        class="size-5"
      />
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
  },
  hasValidationErrors: {
    type: Boolean,
    default: false
  }
})
</script>
