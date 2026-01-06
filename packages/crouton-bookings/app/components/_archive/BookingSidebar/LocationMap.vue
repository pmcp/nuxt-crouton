<script setup lang="ts">
import type { LocationData } from '../../types/booking'

interface Props {
  location: LocationData | null
}

const props = defineProps<Props>()

// Parse coordinates from location field
const coordinates = computed<[number, number] | null>(() => {
  if (!props.location?.location) return null

  try {
    const value = props.location.location
    if (Array.isArray(value)) return [Number(value[0]), Number(value[1])]
    if (typeof value === 'string') {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return [Number(parsed[0]), Number(parsed[1])]
    }
  }
  catch {
    return null
  }
  return null
})

const hasCoordinates = computed(() => {
  return coordinates.value && (coordinates.value[0] !== 0 || coordinates.value[1] !== 0)
})

// Try to get marker color from composable if available, fallback to primary
const markerColor = ref('#3b82f6')
</script>

<template>
  <div class="absolute inset-0 z-0">
    <!-- Map with coordinates -->
    <CroutonMapsMap
      v-if="hasCoordinates"
      :center="coordinates!"
      :zoom="14"
      height="max(400px, 50vh)"
      width="100%"
      class="!rounded-none"
      :fly-to-on-center-change="true"
    >
      <template #default="{ map }">
        <CroutonMapsMarker
          :map="map"
          :position="coordinates!"
          :color="markerColor"
        />
      </template>
    </CroutonMapsMap>

    <!-- No coordinates placeholder -->
    <div
      v-else
      class="h-full flex items-center justify-center bg-neutral-200 dark:bg-neutral-800"
    >
      <div class="text-center text-muted">
        <UIcon name="i-lucide-map" class="w-12 h-12 mb-2 opacity-50" />
        <p class="text-sm">{{ $t('bookings.location.noLocation') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.crouton-map-wrapper) {
  border-radius: 0 !important;
}
</style>
