<script setup lang="ts">
interface SlotItem {
  id: string
  label?: string
  value?: string
}

interface LocationData {
  color?: string | null
  slots?: SlotItem[] | string
}

interface Props {
  slotIds: string[] | string | null
  locationId: string
  teamId: string
}

const props = defineProps<Props>()

// Fetch location to get slots config and color
const { data: locationData } = useFetch<LocationData[]>(
  () => `/api/crouton-bookings/teams/${props.teamId}/customer-locations?ids=${props.locationId}`,
  {
    key: `location-slots-${props.locationId}`,
    immediate: !!props.teamId && !!props.locationId
  }
)

// Get location color (now at location level)
const locationColor = computed(() => {
  return locationData.value?.[0]?.color || '#3b82f6'
})

// Parse location slots
const locationSlots = computed<SlotItem[]>(() => {
  const location = locationData.value?.[0]
  if (!location?.slots) return []
  try {
    const slots = typeof location.slots === 'string'
      ? JSON.parse(location.slots)
      : location.slots
    return Array.isArray(slots) ? slots : []
  }
  catch {
    return []
  }
})

// Parse booking slot IDs
const bookingSlotIds = computed<string[]>(() => {
  if (!props.slotIds) return []
  try {
    const ids = typeof props.slotIds === 'string'
      ? JSON.parse(props.slotIds)
      : props.slotIds
    return Array.isArray(ids) ? ids : []
  }
  catch {
    return []
  }
})

// Get slot position info
const slotInfo = computed(() => {
  if (locationSlots.value.length === 0 || bookingSlotIds.value.length === 0) return null

  const position = locationSlots.value.findIndex(s => bookingSlotIds.value.includes(s.id))
  if (position === -1) return null

  const slot = locationSlots.value[position]
  return {
    totalSlots: locationSlots.value.length,
    position,
    color: locationColor.value, // Use location color
    label: slot?.label || slot?.value || slot?.id
  }
})
</script>

<template>
  <div v-if="slotInfo" class="flex items-center gap-2">
    <CroutonBookingSlotSingleIndicator
      :total-slots="slotInfo.totalSlots"
      :position="slotInfo.position"
      :color="slotInfo.color"
      :label="slotInfo.label"
      size="sm"
    />
    <span class="text-sm">{{ slotInfo.label }}</span>
  </div>
  <span v-else class="text-gray-400">-</span>
</template>
