<template>

  <UForm
    v-if="action === 'delete'"
    :state="items"
    @submit="send(action, collection, items)"
  >
    <UButton
      :loading="loading !== 'notLoading'"
      :disabled="loading !== 'notLoading'"
      size="lg"
      block
      color="gray"
      type="submit"
    >
      <div class="flex items-center gap-1">
        <span class="capitalize">{{ action }}</span><span class="lowercase">{{ collectionWithCapitalSingular(collection) }}</span>
      </div>
    </UButton>
  </UForm>

  <UButton
    v-if="action === 'create' || action === 'update'"
    :loading="loading !== 'notLoading'"
    :disabled="loading !== 'notLoading'"
    size="lg"
    block
    type="submit"
  >
    <div class="flex items-center gap-1">
      <span class="capitalize">{{ action }}</span><span class="lowercase">{{ collectionWithCapitalSingular(collection) }}</span>
    </div>
  </UButton>
</template>

<script setup>
const { send } = useCrud()
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
