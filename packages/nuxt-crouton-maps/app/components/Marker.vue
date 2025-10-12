<script setup lang="ts">
import type { Map, LngLatLike, MarkerOptions } from 'mapbox-gl'

interface Props {
  /** Map instance to add marker to */
  map: Map
  /** Marker position [lng, lat] */
  position: LngLatLike
  /** Marker color */
  color?: string
  /** Marker options */
  options?: MarkerOptions
  /** Popup HTML content */
  popupContent?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: []
  dragStart: []
  drag: []
  dragEnd: []
}>()

// Create marker using Nuxt-Mapbox helper
const marker = ref<any>(null)

onMounted(() => {
  if (!props.map) {
    console.error('[CroutonMapMarker] Map instance is required')
    return
  }

  // Use defineMapboxMarker to create the marker
  const markerOptions: MarkerOptions = {
    color: props.color,
    ...props.options
  }

  // Create marker instance directly
  import('mapbox-gl').then((mapboxgl) => {
    const Marker = mapboxgl.Marker || mapboxgl.default?.Marker

    if (!Marker) {
      console.error('[CroutonMapMarker] Failed to load Mapbox Marker')
      return
    }

    marker.value = new Marker(markerOptions)
      .setLngLat(props.position)
      .addTo(props.map)

    // Add popup if specified
    if (props.popupContent && mapboxgl.Popup) {
      const Popup = mapboxgl.Popup || mapboxgl.default?.Popup
      const popup = new Popup().setHTML(props.popupContent)
      marker.value.setPopup(popup)
    }

    // Add event listeners
    if (marker.value) {
      marker.value.getElement().addEventListener('click', () => emit('click'))

      if (markerOptions.draggable) {
        marker.value.on('dragstart', () => emit('dragStart'))
        marker.value.on('drag', () => emit('drag'))
        marker.value.on('dragend', () => emit('dragEnd'))
      }
    }
  })
})

// Watch for position changes
watch(() => props.position, (newPosition) => {
  if (marker.value) {
    marker.value.setLngLat(newPosition)
  }
})

// Cleanup
onUnmounted(() => {
  if (marker.value) {
    marker.value.remove()
    marker.value = null
  }
})

// Expose marker instance
defineExpose({
  marker
})
</script>

<template>
  <!-- Marker is rendered by Mapbox GL JS, no template needed -->
</template>
