<script setup lang="ts">
import type { AIPackageSuggestion } from '../../composables/useStreamingSchemaParser'

interface Props {
  suggestion: AIPackageSuggestion
  accepted?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accepted: false,
  loading: false
})

const emit = defineEmits<{
  accept: [packageId: string]
  reject: [packageId: string]
}>()

// Package info mapping
const packageInfo: Record<string, { name: string; icon: string; description: string }> = {
  'crouton-bookings': {
    name: 'Crouton Bookings',
    icon: 'i-lucide-calendar-check',
    description: 'Slot-based booking system with availability checking and email notifications'
  },
  'crouton-sales': {
    name: 'Crouton Sales',
    icon: 'i-lucide-shopping-cart',
    description: 'Event-based POS system with products, orders, and receipt printing'
  }
}

const info = computed(() => packageInfo[props.suggestion.packageId] || {
  name: props.suggestion.packageId,
  icon: 'i-lucide-package',
  description: 'Crouton package'
})
</script>

<template>
  <div
    class="relative flex flex-col p-3 rounded-lg border transition-all duration-200"
    :class="[
      accepted
        ? 'border-green-500/50 bg-green-500/5'
        : 'border-[var(--ui-primary)]/30 bg-[var(--ui-primary)]/5 animate-pulse-subtle'
    ]"
  >
    <!-- AI Suggestion Badge -->
    <div class="absolute -top-2 -left-2">
      <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ui-primary)] text-white text-[10px] font-medium">
        <UIcon name="i-lucide-sparkles" class="text-[10px]" />
        AI Suggested
      </div>
    </div>

    <!-- Accepted Badge -->
    <div v-if="accepted" class="absolute -top-2 -right-2">
      <div class="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white">
        <UIcon name="i-lucide-check" class="text-xs" />
      </div>
    </div>

    <!-- Header -->
    <div class="flex items-start gap-2 mt-2 mb-2">
      <div
        class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--ui-primary)]/10"
      >
        <UIcon
          :name="info.icon"
          class="text-lg text-[var(--ui-primary)]"
        />
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="font-semibold text-sm truncate">
          {{ info.name }}
        </h4>
        <p class="text-xs text-[var(--ui-text-muted)] line-clamp-1">
          {{ info.description }}
        </p>
      </div>
    </div>

    <!-- AI Reason -->
    <div class="mb-3 p-2 rounded bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)]">
      <p class="text-xs text-[var(--ui-text-muted)] italic">
        "{{ suggestion.reason }}"
      </p>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <UButton
        v-if="!accepted"
        color="primary"
        variant="solid"
        size="xs"
        class="flex-1"
        :loading="loading"
        @click="emit('accept', suggestion.packageId)"
      >
        <template #leading>
          <UIcon name="i-lucide-check" />
        </template>
        Accept
      </UButton>
      <UButton
        :color="accepted ? 'error' : 'neutral'"
        :variant="accepted ? 'soft' : 'ghost'"
        size="xs"
        :class="accepted ? 'flex-1' : ''"
        @click="emit('reject', suggestion.packageId)"
      >
        <template #leading>
          <UIcon :name="accepted ? 'i-lucide-x' : 'i-lucide-x'" />
        </template>
        {{ accepted ? 'Remove' : 'Dismiss' }}
      </UButton>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse-subtle {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}
</style>
