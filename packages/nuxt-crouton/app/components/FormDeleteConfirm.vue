<script setup lang="ts">
const props = defineProps<{
  collection: string
  items: string[]
}>()

const { close } = useCrouton()
const { mutate } = useCroutonMutate()
const { collectionWithCapitalSingular } = useFormatCollections()
const loading = ref(false)

const itemCount = computed(() => props.items?.length || 0)
const collectionName = computed(() => collectionWithCapitalSingular(props.collection))

const handleDelete = async () => {
  loading.value = true
  try {
    await mutate('delete', props.collection, props.items)
    close()
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  close()
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Warning Icon -->
    <div class="flex justify-center">
      <div class="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
        <UIcon name="i-lucide-trash-2" class="size-8 text-red-600 dark:text-red-400" />
      </div>
    </div>

    <!-- Message -->
    <div class="text-center space-y-2">
      <h3 class="text-lg font-semibold">
        Delete {{ itemCount }} {{ collectionName }}{{ itemCount > 1 ? 's' : '' }}?
      </h3>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        This action cannot be undone.
      </p>
    </div>

    <!-- Buttons -->
    <div class="flex gap-3 justify-end">
      <UButton
        color="neutral"
        variant="outline"
        :disabled="loading"
        @click="handleCancel"
      >
        Cancel
      </UButton>
      <UButton
        color="error"
        :loading="loading"
        @click="handleDelete"
      >
        Delete
      </UButton>
    </div>
  </div>
</template>
