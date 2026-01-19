<script setup lang="ts">
import type { Map, LngLatLike, PopupOptions, Popup } from 'mapbox-gl'

interface Props {
  /** Map instance to add popup to */
  map: Map
  /** Popup position [lng, lat] */
  position: LngLatLike
  /** Popup options */
  options?: PopupOptions
  /** Close button */
  closeButton?: boolean
  /** Close on click */
  closeOnClick?: boolean
  /** Max width */
  maxWidth?: string
}

const props = withDefaults(defineProps<Props>(), {
  closeButton: true,
  closeOnClick: true,
  maxWidth: '240px'
})

const emit = defineEmits<{
  open: []
  close: []
}>()

const popupInstance = ref<Popup | null>(null)
const contentRef = ref<HTMLElement | null>(null)

// Create popup
const createPopup = async () => {
  if (!props.map || !contentRef.value) return

  try {
    // Dynamic import for client-side only
    const mapboxgl = await import('mapbox-gl')
    const Popup = mapboxgl.Popup || mapboxgl.default?.Popup

    if (!Popup) {
      console.error('[CroutonMapPopup] Failed to load Mapbox Popup')
      return
    }

    const popupOptions: PopupOptions = {
      closeButton: props.closeButton,
      closeOnClick: props.closeOnClick,
      maxWidth: props.maxWidth,
      ...props.options
    }

    popupInstance.value = new Popup(popupOptions)
      .setLngLat(props.position)
      .setDOMContent(contentRef.value)
      .addTo(props.map)

    // Event listeners
    popupInstance.value.on('open', () => emit('open'))
    popupInstance.value.on('close', () => emit('close'))
  } catch (error) {
    console.error('[CroutonMapPopup] Error creating popup:', error)
  }
}

// Initialize on mount
onMounted(() => {
  nextTick(() => {
    createPopup()
  })
})

// Watch for position changes
watch(() => props.position, (newPosition) => {
  if (popupInstance.value) {
    popupInstance.value.setLngLat(newPosition)
  }
})

// Cleanup
onUnmounted(() => {
  if (popupInstance.value) {
    popupInstance.value.remove()
    popupInstance.value = null
  }
})

// Expose popup instance and methods
defineExpose({
  popup: popupInstance,
  remove: () => popupInstance.value?.remove(),
  isOpen: () => popupInstance.value?.isOpen()
})
</script>

<template>
  <!-- Hidden container for popup content -->
  <div
    ref="contentRef"
    class="crouton-map-popup-content"
  >
    <slot />
  </div>
</template>

<style scoped>
.crouton-map-popup-content {
  display: none;
}
</style>
