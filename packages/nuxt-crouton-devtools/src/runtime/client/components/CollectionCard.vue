<script setup lang="ts">
import type { CroutonCollection } from '../composables/useCroutonCollections'

interface Props {
  collection: CroutonCollection
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'view-details': [collection: CroutonCollection]
}>()

const layerColor = computed(() => {
  switch (props.collection.layer) {
    case 'external':
      return 'blue'
    case 'internal':
      return 'green'
    default:
      return 'purple'
  }
})
</script>

<template>
  <UCard
    class="cursor-pointer hover:shadow-lg transition-shadow"
    @click="emit('view-details', collection)"
  >
    <template #header>
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ collection.name }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ collection.apiPath || collection.key }}
          </p>
        </div>
        <UBadge
          v-if="collection.layer"
          :color="layerColor"
          variant="subtle"
        >
          {{ collection.layer }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-2">
      <div v-if="collection.meta?.description" class="text-sm text-gray-600 dark:text-gray-400">
        {{ collection.meta.description }}
      </div>

      <div v-if="collection.componentName" class="text-sm">
        <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
          {{ collection.componentName }}
        </code>
      </div>

      <div class="text-xs text-gray-500 dark:text-gray-400 pt-2">
        Key: {{ collection.key }}
      </div>
    </div>
  </UCard>
</template>
