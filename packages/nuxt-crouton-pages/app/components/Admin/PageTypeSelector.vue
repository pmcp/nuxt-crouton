<script setup lang="ts">
/**
 * Page Type Selector Component
 *
 * Allows admin to select a page type when creating a new page.
 * Groups page types by source app.
 */
import type { AggregatedPageType } from '../../composables/usePageTypes'

interface Props {
  modelValue?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useT()
const { pageTypesByApp } = usePageTypes()

const selected = computed({
  get: () => props.modelValue || 'core:regular',
  set: (value) => emit('update:modelValue', value)
})

function selectType(type: AggregatedPageType) {
  selected.value = type.fullId
}

// Category labels for display
const categoryLabels: Record<string, string> = {
  core: 'Core',
  content: 'Content',
  customer: 'Customer-Facing',
  admin: 'Admin',
  display: 'Display',
  other: 'Other'
}

function getAppLabel(appId: string, types: AggregatedPageType[]): string {
  if (appId === 'core') return 'Core Pages'
  return types[0]?.appName || appId
}
</script>

<template>
  <div class="page-type-selector">
    <h3 class="text-lg font-semibold mb-4">
      {{ t('pages.selectType') || 'Select Page Type' }}
    </h3>

    <!-- Group by app -->
    <div
      v-for="(types, appId) in pageTypesByApp"
      :key="appId"
      class="mb-6"
    >
      <h4 class="text-sm font-medium text-muted mb-3 uppercase tracking-wide">
        {{ getAppLabel(appId, types) }}
      </h4>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="type in types"
          :key="type.fullId"
          type="button"
          class="p-4 rounded-lg border-2 text-left transition-all hover:bg-muted/50 hover:border-primary/50"
          :class="[
            selected === type.fullId
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : 'border-default'
          ]"
          @click="selectType(type)"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex items-center justify-center size-10 rounded-lg flex-shrink-0"
              :class="[
                selected === type.fullId
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/10 text-primary'
              ]"
            >
              <UIcon
                :name="type.icon || 'i-lucide-file'"
                class="size-5"
              />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ type.name }}</p>
              <p
                v-if="type.description"
                class="text-sm text-muted line-clamp-2 mt-1"
              >
                {{ type.description }}
              </p>
              <div v-if="type.requiresAuth" class="mt-2">
                <UBadge color="warning" variant="subtle" size="xs">
                  <UIcon name="i-lucide-lock" class="size-3 mr-1" />
                  Requires Login
                </UBadge>
              </div>
            </div>
            <UIcon
              v-if="selected === type.fullId"
              name="i-lucide-check-circle-2"
              class="size-5 text-primary flex-shrink-0"
            />
          </div>
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="Object.keys(pageTypesByApp).length === 0"
      class="text-center py-8 text-muted"
    >
      <UIcon name="i-lucide-file-question" class="size-12 mb-4 mx-auto" />
      <p>No page types available.</p>
      <p class="text-sm">Install app packages to add more page types.</p>
    </div>
  </div>
</template>

<style scoped>
.page-type-selector button:focus {
  @apply outline-none ring-2 ring-primary/50;
}
</style>
