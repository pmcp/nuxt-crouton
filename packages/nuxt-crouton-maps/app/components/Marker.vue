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
  /** Enable smooth animation when position changes (default: true) */
  animateTransitions?: boolean
  /** Animation duration in milliseconds (default: 800) */
  animationDuration?: number
  /** Animation easing function or preset name (default: 'easeInOutCubic') */
  animationEasing?: 'linear' | 'ease' | 'easeInOut' | 'easeInOutCubic' | ((t: number) => number)
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: []
  dragStart: []
  drag: [position: { lng: number, lat: number }]
  dragEnd: [position: { lng: number, lat: number }]
}>()

// Create marker using Nuxt-Mapbox helper
const marker = ref<any>(null)

// Easing functions for smooth animations
const EASING_FUNCTIONS = {
  linear: (t: number) => t,
  ease: (t: number) => t * (2 - t),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// Keep track of current animation frame
let animationFrameId: number | null = null

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
        marker.value.on('drag', () => {
          const lngLat = marker.value.getLngLat()
          emit('drag', { lng: lngLat.lng, lat: lngLat.lat })
        })
        marker.value.on('dragend', () => {
          const lngLat = marker.value.getLngLat()
          emit('dragEnd', { lng: lngLat.lng, lat: lngLat.lat })
        })
      }
    }
  })
})

// Watch for position changes with optional animation
watch(() => props.position, (newPosition, oldPosition) => {
  if (!marker.value) return

  // If animations disabled or no old position, update immediately
  if (props.animateTransitions === false || !oldPosition) {
    marker.value.setLngLat(newPosition)
    return
  }

  // Cancel any ongoing animation
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }

  // Convert positions to array format [lng, lat]
  const startPos = Array.isArray(oldPosition)
    ? [oldPosition[0], oldPosition[1]]
    : [oldPosition.lng, oldPosition.lat]
  const targetPos = Array.isArray(newPosition)
    ? [newPosition[0], newPosition[1]]
    : [newPosition.lng, newPosition.lat]

  // Get animation settings
  const duration = props.animationDuration ?? 800

  // Get easing function
  let easingFn: (t: number) => number
  if (typeof props.animationEasing === 'function') {
    easingFn = props.animationEasing
  } else {
    easingFn = EASING_FUNCTIONS[props.animationEasing || 'easeInOutCubic']
  }

  // Animate using requestAnimationFrame
  const startTime = performance.now()

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easingFn(progress)

    // Interpolate position
    const interpolatedPos = [
      startPos[0] + (targetPos[0] - startPos[0]) * easedProgress,
      startPos[1] + (targetPos[1] - startPos[1]) * easedProgress
    ]

    marker.value?.setLngLat(interpolatedPos as LngLatLike)

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate)
    } else {
      animationFrameId = null
    }
  }

  animationFrameId = requestAnimationFrame(animate)
})

// Cleanup
onUnmounted(() => {
  // Cancel any ongoing animation
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  // Remove marker
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
