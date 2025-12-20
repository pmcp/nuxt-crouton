<template>
  <div
    v-if="pending"
    class="p-6"
  >
    <div class="space-y-4">
      <USkeleton class="h-8 w-1/3" />
      <USkeleton class="h-4 w-full" />
      <USkeleton class="h-4 w-2/3" />
      <USkeleton class="h-32 w-full" />
    </div>
  </div>

  <div
    v-else-if="error"
    class="p-6"
  >
    <div class="rounded-lg bg-error-50 dark:bg-error-900/20 p-4">
      <div class="flex items-start gap-3">
        <UIcon
          name="i-lucide-octagon-alert"
          class="w-5 h-5 text-error-600 dark:text-error-400 mt-0.5"
        />
        <div>
          <h3 class="font-semibold text-error-900 dark:text-error-100 mb-1">
            Error loading details
          </h3>
          <p class="text-sm text-error-700 dark:text-error-300">
            {{ error }}
          </p>
        </div>
      </div>
    </div>
  </div>

  <div
    v-else
    class="flex flex-col h-full"
  >
    <!-- Header with Title and Actions -->
    <div class="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <slot name="header-title">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white truncate">
              {{ title }}
            </h2>
          </slot>
          <slot name="header-subtitle">
            <p
              v-if="subtitle"
              class="mt-1 text-sm text-gray-600 dark:text-gray-400"
            >
              {{ subtitle }}
            </p>
          </slot>
        </div>

        <div class="flex-shrink-0 flex items-center gap-2">
          <slot name="header-actions">
            <!-- Default actions -->
            <UButton
              v-if="canEdit"
              icon="i-lucide-pencil"
              color="primary"
              variant="soft"
              @click="$emit('edit')"
            >
              Edit
            </UButton>
          </slot>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 overflow-y-auto">
      <div class="p-6 space-y-6">
        <slot
          name="content"
          :item="item"
        >
          <!-- Default content slot - collections should override this -->
          <div class="text-sm text-gray-500 dark:text-gray-400">
            No content provided
          </div>
        </slot>
      </div>
    </div>

    <!-- Footer (optional) -->
    <div
      v-if="$slots.footer"
      class="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 px-6 py-4"
    >
      <slot
        name="footer"
        :item="item"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  item?: any
  pending?: boolean
  error?: string | null
  title?: string
  subtitle?: string
  canEdit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  item: null,
  pending: false,
  error: null,
  title: 'Details',
  subtitle: '',
  canEdit: true
})

defineEmits<{
  edit: []
}>()
</script>
