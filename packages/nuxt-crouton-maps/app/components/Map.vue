<script setup lang="ts">
import type { LngLatLike } from 'mapbox-gl'

interface Props {
  /** Map container ID (default: auto-generated) */
  id?: string
  /** Initial center coordinates [lng, lat] */
  center?: LngLatLike
  /** Initial zoom level */
  zoom?: number
  /** Mapbox style URL */
  style?: string
  /** Container height (CSS value) */
  height?: string
  /** Container width (CSS value) */
  width?: string
  /** Additional CSS classes */
  class?: string
  /** Enable smooth flyTo animation when center changes (default: false) */
  flyToOnCenterChange?: boolean
  /** FlyTo animation duration in milliseconds (default: 800) */
  flyToDuration?: number
  /** FlyTo easing function (default: easeInOutCubic) */
  flyToEasing?: (t: number) => number
}

const props = withDefaults(defineProps<Props>(), {
  id: () => `map-${Math.random().toString(36).substr(2, 9)}`,
  height: '400px',
  width: '100%'
})

const emit = defineEmits<{
  load: [map: any]
  error: [error: string]
}>()

console.log('[CroutonMapsMap] Component mounted with props:', props)

// Get map config
const config = useMapConfig()
console.log('[CroutonMapsMap] Config loaded:', config)

// Map state
const mapInstance = ref<any>(null)
const isLoaded = ref(false)
const error = ref<string | null>(null)

// Compute map options for MapboxMap component
const mapOptions = computed(() => ({
  style: props.style || config.style || 'mapbox://styles/mapbox/streets-v12',
  center: props.center || config.center || [-122.4194, 37.7749],
  zoom: props.zoom || config.zoom || 12
}))

// Handle map load
const handleMapLoad = (map: any) => {
  mapInstance.value = map
  isLoaded.value = true
  error.value = null
  emit('load', map)
}

// Handle map error
const handleMapError = (err: any) => {
  const errorMessage = err?.message || 'Failed to load map'
  error.value = errorMessage
  isLoaded.value = false
  emit('error', errorMessage)
}

// Use Nuxt-Mapbox composable to get map instance using callback
useMapbox(props.id, (map) => {
  console.log('[CroutonMapsMap] Map loaded via useMapbox callback:', !!map)
  if (map && !isLoaded.value) {
    handleMapLoad(map)
  }
})

// Default easing function for flyTo
const defaultEasing = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// Watch for center changes and optionally animate with flyTo
watch(() => props.center, (newCenter, oldCenter) => {
  // Only animate if flyToOnCenterChange is enabled and map is loaded
  if (!props.flyToOnCenterChange || !mapInstance.value || !isLoaded.value) return
  if (!newCenter || !oldCenter) return

  // Convert to array format for comparison
  const getCoords = (center: LngLatLike) => {
    return Array.isArray(center) ? center : [center.lng, center.lat]
  }

  const oldCoords = getCoords(oldCenter)
  const newCoords = getCoords(newCenter)

  // Only animate if coordinates actually changed
  if (oldCoords[0] === newCoords[0] && oldCoords[1] === newCoords[1]) return

  // Use Mapbox's native flyTo for smooth panning
  mapInstance.value.flyTo({
    center: newCenter,
    duration: props.flyToDuration ?? 800,
    essential: true,
    easing: props.flyToEasing || defaultEasing
  })
})

// Expose map instance and state
defineExpose({
  map: mapInstance,
  isLoaded,
  error
})
</script>

<template>
  <div
    class="crouton-map-wrapper"
    :class="props.class"
  >
    <ClientOnly>
      <!-- Nuxt-Mapbox map component -->
      <MapboxMap
        :map-id="props.id"
        :options="mapOptions"
        :style="{ height: props.height, width: props.width }"
        @mb-created="handleMapLoad"
        @mb-error="handleMapError"
      >
        <!-- Pass through default slot for markers, popups, etc. -->
        <slot
          v-if="isLoaded && mapInstance"
          :map="mapInstance"
        />
      </MapboxMap>

      <!-- Loading state (client-side while map loads) -->
      <div
        v-if="!isLoaded && !error"
        class="crouton-map-loading"
      >
        <div class="crouton-map-spinner">
          <svg
            class="animate-spin h-8 w-8 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>

      <!-- Error state -->
      <div
        v-if="error"
        class="crouton-map-error"
      >
        <div class="crouton-map-error-content">
          <svg
            class="h-8 w-8 text-error"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
          <p class="mt-2 text-sm text-gray-600">
            {{ error }}
          </p>
        </div>
      </div>

      <!-- SSR fallback: loading spinner (not absolute positioned) -->
      <template #fallback>
        <div
          class="crouton-map-fallback"
          :style="{ height: props.height, width: props.width }"
        >
          <div class="crouton-map-spinner">
            <svg
              class="animate-spin h-8 w-8 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.crouton-map-wrapper {
  position: relative;
  overflow: hidden;
  border-radius: 0.5rem;
}

.crouton-map-loading,
.crouton-map-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 1000;
}

.crouton-map-error-content {
  text-align: center;
  padding: 1rem;
}

/* SSR fallback - not absolute positioned so it takes up space */
.crouton-map-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
}
</style>
