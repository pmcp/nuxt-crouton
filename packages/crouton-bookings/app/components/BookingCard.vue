<script setup lang="ts">
import type { Booking, SlotItem, EmailTriggerType, EmailTriggerStatus } from '../types/booking'

interface Props {
  booking: Booking
  highlighted?: boolean
  /** Which email action is currently being sent */
  sendingEmailType?: EmailTriggerType | null
}

const props = withDefaults(defineProps<Props>(), {
  highlighted: false,
  sendingEmailType: null,
})

const emit = defineEmits<{
  'resend-email': [triggerType: EmailTriggerType]
  'date-click': [date: Date]
  'edit': [booking: Booking]
}>()

const { t, locale } = useI18n()
const { parseSlotIds, parseLocationSlots, getSlotLabel } = useBookingSlots()
const { getGroupLabel } = useBookingOptions()
const { isEmailEnabled } = useBookingEmail()

// Is this booking cancelled?
const isCancelled = computed(() => props.booking.status === 'cancelled')

// Parse slot IDs from booking
const bookedSlotIds = computed(() => parseSlotIds(props.booking.slot))

// Parse location slots
const locationSlots = computed<SlotItem[]>(() => {
  return parseLocationSlots(props.booking.locationData)
})

// Get booked slot labels for display
const slotLabel = computed(() => {
  const slotIds = bookedSlotIds.value
  if (slotIds.length === 0) return ''
  const labels = slotIds.map(id => getSlotLabel(id, locationSlots.value))
  return labels.join(', ')
})

// Location color for slot indicator
const locationColor = computed(() => {
  return props.booking.locationData?.color || '#3b82f6'
})

// Is this an inventory mode booking?
const isInventoryMode = computed(() => {
  return props.booking.locationData?.inventoryMode === true
})

// Booker info - handle Drizzle leftJoin which returns { id: null, name: null } instead of null
const bookerName = computed(() => {
  const ownerName = props.booking.ownerUser?.name
  const createdByName = props.booking.createdByUser?.name
  // Filter out empty/null names
  if (ownerName && ownerName.trim()) return ownerName
  if (createdByName && createdByName.trim()) return createdByName
  return null
})

const bookerAvatar = computed(() => {
  return props.booking.ownerUser?.avatarUrl
    || props.booking.createdByUser?.avatarUrl
    || null
})

const bookerInitials = computed(() => {
  if (!bookerName.value) return '?'
  return bookerName.value
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

// Email details helpers
const emailDetails = computed(() => props.booking.emailDetails || [])
const emailActions = computed(() => props.booking.emailActions || [])

const confirmationStatus = computed((): EmailTriggerStatus | null => {
  return emailDetails.value.find(e => e.triggerType === 'booking_created') || null
})

const reminderStatus = computed((): EmailTriggerStatus | null => {
  return emailDetails.value.find(e => e.triggerType === 'reminder_before') || null
})

// Format date for display (e.g., "Jan 10")
function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric' }).format(date)
}

// Get confirmation status text
const confirmationText = computed(() => {
  const status = confirmationStatus.value
  if (!status) return null

  if (status.status === 'sent' && status.sentAt) {
    return `Sent ${formatShortDate(status.sentAt)}`
  }
  if (status.status === 'pending') {
    return 'Pending'
  }
  if (status.status === 'failed') {
    return 'Failed'
  }
  return null // not_sent - don't show
})

// Get reminder status text
const reminderText = computed(() => {
  const status = reminderStatus.value
  if (!status) return null

  if (status.status === 'sent' && status.sentAt) {
    return `Sent ${formatShortDate(status.sentAt)}`
  }
  if (status.status === 'pending') {
    return 'Pending'
  }
  if (status.status === 'failed') {
    return 'Failed'
  }
  if (status.status === 'not_sent' && status.scheduledFor) {
    return `Sends ${formatShortDate(status.scheduledFor)}`
  }
  return null
})

// Email dropdown items - use onSelect for Nuxt UI 4
const emailDropdownItems = computed(() => {
  return emailActions.value.map(action => ({
    label: action.label,
    icon: action.icon,
    disabled: !!props.sendingEmailType,
    loading: props.sendingEmailType === action.triggerType,
    onSelect: () => emit('resend-email', action.triggerType as EmailTriggerType)
  }))
})

const hasEmailDropdown = computed(() => {
  return isEmailEnabled.value && emailDropdownItems.value.length > 0
})

const hasEmailStatus = computed(() => {
  return isEmailEnabled.value && (confirmationText.value || reminderText.value)
})
</script>

<template>
  <UCard
    variant="soft"
    :ui="{
      root: [
        'transition-all duration-200',
        isCancelled ? 'opacity-60' : '',
        highlighted ? 'bg-elevated shadow-sm' : ''
      ],
      body: 'p-2'
    }"
  >
    <div class="flex gap-3">
      <!-- Date badge (clickable to navigate calendar) -->
      <button
        type="button"
        class="shrink-0 cursor-pointer hover:scale-105 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
        @click="emit('date-click', new Date(booking.date))"
      >
        <CroutonBookingsDateBadge
          :date="booking.date"
          :variant="isCancelled ? 'error' : 'primary'"
          :highlighted="highlighted"
          :highlight-color="locationColor"
        />
      </button>

      <!-- Main content area -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-4">
          <!-- Left: Main booking info -->
          <div class="flex flex-col gap-1 min-w-0 flex-1">
            <!-- Location name -->
            <span
              class="text-sm font-medium truncate"
              :class="{ 'line-through text-muted': isCancelled }"
            >
              {{ booking.locationData?.title || 'Unknown Location' }}
            </span>

            <!-- Slot indicator + time -->
            <div class="flex items-center gap-2">
              <template v-if="isInventoryMode">
                <UIcon name="i-lucide-box" class="size-3 text-primary" />
                <span class="text-xs text-muted">{{ slotLabel }}</span>
              </template>
              <template v-else>
                <CroutonBookingsSlotIndicator
                  v-if="locationSlots.length > 0"
                  :slots="locationSlots"
                  :booked-slot-ids="bookedSlotIds"
                  :color="isCancelled ? '#9ca3af' : locationColor"
                  size="sm"
                />
                <span class="text-xs text-muted">{{ slotLabel }}</span>
              </template>
            </div>

            <!-- Group badge + Email status -->
            <div class="flex items-center gap-3 flex-wrap">
              <UBadge
                v-if="booking.group"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                {{ getGroupLabel(booking.group) }}
              </UBadge>

              <!-- Email status inline -->
              <div v-if="hasEmailStatus" class="flex items-center gap-2 text-[11px]">
                <div
                  v-if="confirmationText"
                  class="flex items-center gap-1"
                  :class="{
                    'text-success': confirmationStatus?.status === 'sent',
                    'text-warning': confirmationStatus?.status === 'pending',
                    'text-error': confirmationStatus?.status === 'failed',
                  }"
                >
                  <UIcon
                    :name="confirmationStatus?.status === 'sent' ? 'i-lucide-check' : confirmationStatus?.status === 'failed' ? 'i-lucide-x' : 'i-lucide-clock'"
                    class="size-3"
                  />
                  <span>{{ confirmationText }}</span>
                </div>
                <div
                  v-if="reminderText"
                  class="flex items-center gap-1"
                  :class="{
                    'text-success': reminderStatus?.status === 'sent',
                    'text-warning': reminderStatus?.status === 'pending',
                    'text-error': reminderStatus?.status === 'failed',
                    'text-muted': reminderStatus?.status === 'not_sent',
                  }"
                >
                  <UIcon
                    :name="reminderStatus?.status === 'sent' ? 'i-lucide-bell-ring' : 'i-lucide-bell'"
                    class="size-3"
                  />
                  <span>{{ reminderText }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Booker + Actions -->
          <div class="flex flex-col items-end gap-1 shrink-0">
            <!-- Booker info -->
            <div v-if="bookerName" class="flex items-center gap-1.5">
              <UAvatar
                v-if="bookerAvatar"
                :src="bookerAvatar"
                :alt="bookerName"
                size="2xs"
              />
              <div
                v-else
                class="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-medium"
              >
                {{ bookerInitials }}
              </div>
              <span class="text-xs text-muted">{{ bookerName }}</span>
            </div>

            <!-- Actions row -->
            <div class="flex items-center gap-1">
              <!-- Edit button -->
              <UButton
                variant="ghost"
                color="neutral"
                size="xs"
                icon="i-lucide-pencil"
                @click="emit('edit', booking)"
              />

              <!-- Send email dropdown -->
              <UDropdownMenu
                v-if="hasEmailDropdown"
                :items="emailDropdownItems"
                :ui="{ content: 'min-w-40' }"
              >
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  icon="i-lucide-send"
                  trailing-icon="i-lucide-chevron-down"
                  :loading="!!sendingEmailType"
                >
                  Send
                </UButton>
              </UDropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
