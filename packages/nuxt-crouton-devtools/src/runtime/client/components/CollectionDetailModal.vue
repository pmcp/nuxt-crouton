<script setup lang="ts">
import type { CroutonCollection } from '../composables/useCroutonCollections'

interface Props {
  collection: CroutonCollection | null
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})
</script>

<template>
  <UModal v-model="isOpen">
    <template #content="{ close }">
      <div
        v-if="collection"
        class="p-6"
      >
        <div class="flex items-start justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ collection.name }}
            </h2>
            <p class="text-gray-600 dark:text-gray-400 mt-1">
              Collection Details
            </p>
          </div>
          <UButton
            color="gray"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="close"
          />
        </div>

        <div class="space-y-6">
          <div>
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Configuration
            </h3>
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600 dark:text-gray-400">Key:</span>
                <code class="text-sm">{{ collection.key }}</code>
              </div>
              <USeparator />
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600 dark:text-gray-400">API Path:</span>
                <code class="text-sm">{{ collection.apiPath || 'N/A' }}</code>
              </div>
              <USeparator v-if="collection.componentName" />
              <div
                v-if="collection.componentName"
                class="flex justify-between items-center"
              >
                <span class="text-sm text-gray-600 dark:text-gray-400">Component:</span>
                <code class="text-sm">{{ collection.componentName }}</code>
              </div>
              <USeparator />
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600 dark:text-gray-400">Layer:</span>
                <code class="text-sm">{{ collection.layer || 'unknown' }}</code>
              </div>
            </div>
          </div>

          <div v-if="collection.meta">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Metadata
            </h3>
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
              <div
                v-if="collection.meta.label"
                class="flex justify-between items-center"
              >
                <span class="text-sm text-gray-600 dark:text-gray-400">Label:</span>
                <span class="text-sm">{{ collection.meta.label }}</span>
              </div>
              <div
                v-if="collection.meta.description"
                class="flex flex-col gap-1"
              >
                <span class="text-sm text-gray-600 dark:text-gray-400">Description:</span>
                <p class="text-sm">
                  {{ collection.meta.description }}
                </p>
              </div>
              <div
                v-if="collection.meta.icon"
                class="flex justify-between items-center"
              >
                <span class="text-sm text-gray-600 dark:text-gray-400">Icon:</span>
                <code class="text-sm">{{ collection.meta.icon }}</code>
              </div>
            </div>
          </div>

          <div v-if="collection.columns && collection.columns.length">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Columns
            </h3>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="column in collection.columns"
                :key="column"
                color="gray"
                variant="subtle"
              >
                {{ column }}
              </UBadge>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Full Configuration (JSON)
            </h3>
            <pre class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto text-xs">{{ JSON.stringify(collection, null, 2) }}</pre>
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <UButton
            color="gray"
            variant="ghost"
            @click="close"
          >
            Close
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
