<script setup lang="ts">
const { t } = useI18n()

interface SlotItem {
  id: string
  label?: string
  value?: string
  color?: string
}

interface BookingData {
  id: string
  location: string
  date: string | Date
  slot: string[] | string | null
  group?: string | null
  status: string
  createdAt?: string | Date
  locationData?: {
    id: string
    title: string
    street?: string
    city?: string
    slots?: SlotItem[] | string
  }
}

interface Props {
  booking: BookingData
  showAddress?: boolean
  groupOptions?: Array<{ id: string; label: string }>
  // Action support for sidebar
  showActions?: boolean
  actionType?: 'cancel' | 'delete'
  loading?: boolean
  showConfirmation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAddress: true,
  groupOptions: () => [],
  showActions: false,
  actionType: 'cancel',
  loading: false,
  showConfirmation: false
})

const emit = defineEmits<{
  cancel: []
  delete: []
  'show-confirmation': []
  'hide-confirmation': []
}>()

// Status color mapping
const STATUSES = [
  { value: 'confirmed', color: 'success' as const },
  { value: 'pending', color: 'warning' as const },
  { value: 'cancelled', color: 'error' as const },
  { value: 'completed', color: 'neutral' as const },
]

// Format date for display
function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

// Parse location slots helper
function parseLocationSlots(): SlotItem[] {
  if (!props.booking.locationData?.slots) return []
  try {
    const slots = typeof props.booking.locationData.slots === 'string'
      ? JSON.parse(props.booking.locationData.slots)
      : props.booking.locationData.slots
    return Array.isArray(slots) ? slots : []
  }
  catch {
    return []
  }
}

// Parse booking slot IDs helper
function parseBookingSlotIds(): string[] {
  if (!props.booking.slot) return []
  try {
    const slotIds = typeof props.booking.slot === 'string'
      ? JSON.parse(props.booking.slot)
      : props.booking.slot
    return Array.isArray(slotIds) ? slotIds : []
  }
  catch {
    return []
  }
}

// Get slot label from booking
const slotLabel = computed(() => {
  const locationSlots = parseLocationSlots()
  const bookingSlotIds = parseBookingSlotIds()

  if (locationSlots.length === 0 || bookingSlotIds.length === 0) return '-'

  // Check for all-day first
  if (bookingSlotIds.includes('all-day')) return 'All Day'

  const slot = locationSlots.find(s => bookingSlotIds.includes(s.id))
  return slot?.label || slot?.value || '-'
})

// Get slot position info for indicator
const slotPositionInfo = computed(() => {
  const locationSlots = parseLocationSlots()
  const bookingSlotIds = parseBookingSlotIds()

  if (locationSlots.length === 0 || bookingSlotIds.length === 0) return null

  const position = locationSlots.findIndex(s => bookingSlotIds.includes(s.id))
  if (position === -1) return null

  return {
    totalSlots: locationSlots.length,
    position,
    color: locationSlots[position]?.color
  }
})

// Status badge color
const statusColor = computed(() => {
  const statusItem = STATUSES.find(s => s.value === props.booking.status?.toLowerCase())
  return statusItem?.color || 'neutral'
})

// Status badge label
const statusLabel = computed(() => {
  const key = `bookings.status.${props.booking.status?.toLowerCase()}`
  const translated = t(key)
  return translated !== key ? translated : props.booking.status
})

// Get group label
const groupLabel = computed(() => {
  if (!props.booking.group) return null
  const group = props.groupOptions.find(g => g.id === props.booking.group)
  return group?.label || props.booking.group
})

// Location title
const locationTitle = computed(() => {
  return props.booking.locationData?.title || t('bookings.list.unknownLocation')
})

// Address
const address = computed(() => {
  const parts = [
    props.booking.locationData?.street,
    props.booking.locationData?.city
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
})

// Handle action click
function handleAction() {
  emit('show-confirmation')
}

// Confirm action
function confirmAction() {
  if (props.actionType === 'cancel') {
    emit('cancel')
  } else if (props.actionType === 'delete') {
    emit('delete')
  }
}
</script>

<template>
  <UCard>
    <div class="flex items-start gap-4">
      <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
        <UIcon name="i-lucide-calendar-check" class="w-6 h-6 text-primary" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="font-semibold">
              {{ locationTitle }}
            </h3>
            <div class="flex items-center gap-2 mt-1">
              <CroutonBookingSlotSingleIndicator
                v-if="slotPositionInfo"
                :total-slots="slotPositionInfo.totalSlots"
                :position="slotPositionInfo.position"
                :color="slotPositionInfo.color"
                :label="slotLabel"
                size="sm"
              />
              <p class="text-sm text-muted">
                {{ formatDate(booking.date) }} {{ t('bookings.common.at') }} {{ slotLabel }}
                <span v-if="groupLabel" class="ml-2">
                  · {{ groupLabel }}
                </span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <UBadge :color="statusColor" variant="subtle">
              {{ statusLabel }}
            </UBadge>

            <!-- Action button -->
            <UButton
              v-if="showActions && !showConfirmation"
              variant="ghost"
              :color="actionType === 'delete' ? 'error' : 'neutral'"
              size="xs"
              :icon="actionType === 'delete' ? 'i-lucide-trash-2' : 'i-lucide-x'"
              class="transition-all duration-200 hover:scale-110"
              :class="actionType !== 'delete' && 'hover:rotate-90 hover:text-error'"
              @click="handleAction"
            />
          </div>
        </div>

        <div v-if="showAddress && address" class="mt-2">
          <p class="text-xs text-muted">
            <UIcon name="i-lucide-map-pin" class="w-3 h-3 inline mr-1" />
            {{ address }}
          </p>
        </div>
      </div>
    </div>

    <!-- Confirmation row -->
    <div v-if="showActions && showConfirmation" class="mt-3 pt-3 border-t border-muted/20">
      <div class="flex items-center justify-between gap-2 bg-error/10 rounded-lg px-3 py-2">
        <span class="text-xs text-muted">
          {{ actionType === 'delete' ? 'Delete permanently?' : 'Cancel this booking?' }}
        </span>
        <div class="flex items-center gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            @click="emit('hide-confirmation')"
          >
            Keep
          </UButton>
          <UButton
            variant="soft"
            color="error"
            size="xs"
            :loading="loading"
            @click="confirmAction"
          >
            {{ actionType === 'delete' ? 'Delete' : 'Cancel' }}
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
