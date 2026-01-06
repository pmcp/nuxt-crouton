<script setup lang="ts">
import type { LocationData } from '../../types/booking'

interface Props {
  location: LocationData | null
}

const props = defineProps<Props>()

const fullAddress = computed(() => {
  if (!props.location) return ''
  return [
    props.location.street,
    props.location.zip,
    props.location.city,
  ].filter(Boolean).join(', ')
})

const hasContent = computed(() => {
  return props.location?.content && props.location.content.trim().length > 0
})
</script>

<template>
  <ClientOnly>
    <div v-if="location" class="max-w-5xl mx-auto px-6 py-8">
      <div class="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 lg:gap-12">
        <!-- Left: Title & Address -->
        <div class="space-y-3">
          <h2 class="text-2xl font-bold text-neutral-900 dark:text-white uppercase tracking-wide">
            {{ location.title }}
          </h2>
          <div v-if="fullAddress" class="flex items-start gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span>{{ fullAddress }}</span>
          </div>
        </div>

        <!-- Right: Description -->
        <div>
          <div
            v-if="hasContent"
            class="prose prose-neutral dark:prose-invert prose-sm max-w-none"
            v-html="location.content"
          />
          <p v-else class="text-sm text-neutral-400 dark:text-neutral-500 italic">
            {{ $t('bookings.location.noInfo') }}
          </p>
        </div>
      </div>
    </div>

    <!-- No location selected -->
    <div v-else class="px-6 py-8 text-center text-neutral-400">
      <p>{{ $t('bookings.location.selectToView') }}</p>
    </div>

    <!-- SSR fallback: skeleton -->
    <template #fallback>
      <div class="max-w-5xl mx-auto px-6 py-8">
        <div class="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 lg:gap-12 animate-pulse">
          <div class="space-y-3">
            <div class="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
            <div class="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-full" />
          </div>
          <div class="space-y-3">
            <div class="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-full" />
            <div class="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-5/6" />
            <div class="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-4/6" />
          </div>
        </div>
      </div>
    </template>
  </ClientOnly>
</template>
