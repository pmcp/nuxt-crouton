<script setup lang="ts">
import type { GeocodeResult } from '../composables/useGeocode'
import type { CurrentLocationOptions } from '../composables/useCurrentLocation'

interface Props {
  /** Button label text (default: "Use my location"). */
  label?: string
  /** Lucide/Heroicons icon name (default: i-lucide-map-pin). */
  icon?: string
  /** UButton color variant — passed straight through. */
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  /** UButton variant — passed straight through. */
  variant?: 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link'
  /** UButton size — passed straight through. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Show a toast on permission-denied / failure (default: true). */
  notifyOnError?: boolean
  /** Pass-through geolocation options (accuracy, timeout, etc.). */
  options?: CurrentLocationOptions
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Use my location',
  icon: 'i-lucide-map-pin',
  color: 'neutral',
  variant: 'outline',
  size: 'sm',
  notifyOnError: true
})

const emit = defineEmits<{
  /** Fired with the geocoded result on success. */
  located: [result: GeocodeResult]
  /** Fired with an error message on failure. */
  failed: [message: string]
}>()

const { getCurrentLocation, loading, error } = useCurrentLocation()
const toast = useToast()

async function handleClick() {
  const result = await getCurrentLocation(props.options)
  if (result) {
    emit('located', result)
    return
  }
  const message = error.value ?? 'Could not get your location'
  emit('failed', message)
  if (props.notifyOnError) {
    toast.add({
      title: 'Location unavailable',
      description: message,
      color: 'warning',
      icon: 'i-lucide-map-pin-off'
    })
  }
}
</script>

<template>
  <UButton
    :loading="loading"
    :icon="icon"
    :color="color"
    :variant="variant"
    :size="size"
    type="button"
    @click="handleClick"
  >
    {{ label }}
  </UButton>
</template>
