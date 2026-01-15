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
  'delete': [booking: Booking]
}>()

// Hover state for action menu
const isHovered = ref(false)

const { t, locale } = useI18n()
const { parseSlotIds, parseLocationSlots, getSlotLabel } = useBookingSlots()
const { getGroupLabel } = useBookingOptions()
const { isEmailEnabled } = useBookingEmail()

// Get localized location title with fallbacks
function getLocationTitle(locationData: Booking['locationData']): string {
  if (!locationData) return 'Unknown Location'
  const translations = locationData.translations as Record<string, { title?: string }> | undefined

  return translations?.[locale.value]?.title
    || translations?.en?.title
    || locationData.title
    || 'Unknown Location'
}

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
const bookerUser = computed(() => {
  const owner = props.booking.ownerUser
  const createdBy = props.booking.createdByUser

  // Prefer owner, fallback to createdBy
  if (owner?.name && owner.name.trim()) {
    return { name: owner.name, email: owner.email, avatarUrl: owner.avatarUrl }
  }
  if (createdBy?.name && createdBy.name.trim()) {
    return { name: createdBy.name, email: createdBy.email, avatarUrl: createdBy.avatarUrl }
  }
  return null
})

// Format date for display (e.g., "Jan 5")
function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric' }).format(date)
}

// Format created date (e.g., "Jan 5")
const createdDateText = computed(() => {
  if (!props.booking.createdAt) return ''
  return formatShortDate(String(props.booking.createdAt))
})

// Email details from API
const emailDetails = computed(() => props.booking.emailDetails || [])

// Simple email action buttons
interface EmailAction {
  type: EmailTriggerType
  icon: string
  tooltip: string
  canSend: boolean
}

const emailActions = computed<EmailAction[]>(() => {
  const actions: EmailAction[] = []
  const bookingDate = props.booking.date ? new Date(props.booking.date) : null
  const now = new Date()
  const isPast = bookingDate ? bookingDate < now : false

  // Confirmation email - always available
  const confirmDetail = emailDetails.value.find(e => e.triggerType === 'booking_created')
  actions.push({
    type: 'booking_created',
    icon: confirmDetail?.status === 'sent' ? 'i-lucide-mail-check' : 'i-lucide-mail',
    tooltip: confirmDetail?.status === 'sent' ? 'Resend confirmation' : 'Send confirmation',
    canSend: true
  })

  // Reminder - only for future bookings
  if (!isPast && !isCancelled.value) {
    const reminderDetail = emailDetails.value.find(e => e.triggerType === 'reminder_before')
    actions.push({
      type: 'reminder_before',
      icon: reminderDetail?.status === 'sent' ? 'i-lucide-bell-ring' : 'i-lucide-bell',
      tooltip: reminderDetail?.status === 'sent' ? 'Resend reminder' : 'Send reminder',
      canSend: true
    })
  }

  // Cancellation - only if cancelled
  if (isCancelled.value) {
    const cancelDetail = emailDetails.value.find(e => e.triggerType === 'booking_cancelled')
    actions.push({
      type: 'booking_cancelled',
      icon: cancelDetail?.status === 'sent' ? 'i-lucide-mail-x' : 'i-lucide-mail-minus',
      tooltip: cancelDetail?.status === 'sent' ? 'Resend cancellation' : 'Send cancellation',
      canSend: true
    })
  }

  // Follow-up - only for past bookings
  if (isPast && !isCancelled.value) {
    const followupDetail = emailDetails.value.find(e => e.triggerType === 'follow_up_after')
    actions.push({
      type: 'follow_up_after',
      icon: followupDetail?.status === 'sent' ? 'i-lucide-mail-check' : 'i-lucide-mail-question',
      tooltip: followupDetail?.status === 'sent' ? 'Resend follow-up' : 'Send follow-up',
      canSend: true
    })
  }

  return actions
})
</script>

<template>
  <UCard
    variant="soft"
    :ui="{
      root: [
        'transition-all duration-200 relative overflow-hidden',
        isCancelled ? 'opacity-60' : '',
        highlighted ? 'bg-elevated shadow-sm' : ''
      ],
      body: 'p-2 sm:p-2'
    }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Slide-out action menu -->
    <div
      class="absolute right-0 top-0 bottom-0 flex flex-col items-center justify-center gap-0.5 px-1.5 bg-elevated/95 backdrop-blur-sm transition-transform duration-200 ease-out z-10"
      :class="isHovered ? 'translate-x-0' : 'translate-x-full'"
    >
      <UButton
        variant="ghost"
        color="neutral"
        size="xs"
        icon="i-lucide-pencil"
        @click="emit('edit', booking)"
      />
      <UButton
        variant="ghost"
        color="error"
        size="xs"
        icon="i-lucide-trash-2"
        @click="emit('delete', booking)"
      />
    </div>

    <!-- Main layout: responsive flex with space-between on desktop -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <!-- Left side: Date badge + Info -->
      <div class="flex gap-3 flex-1 min-w-0 md:flex-initial">
        <!-- Date badge (clickable to navigate calendar) -->
        <button
          type="button"
          class="shrink-0 cursor-pointer hover:scale-105 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg self-start"
          @click="emit('date-click', new Date(booking.date))"
        >
          <CroutonBookingsDateBadge
            :date="booking.date"
            :variant="isCancelled ? 'error' : 'primary'"
            :highlighted="highlighted"
            :highlight-color="locationColor"
          />
        </button>

        <!-- Card info -->
        <div class="flex-1 min-w-0 flex flex-col gap-1.5">
          <!-- Location name -->
          <span
            class="text-sm font-medium truncate"
            :class="{ 'line-through text-muted': isCancelled }"
          >
            {{ getLocationTitle(booking.locationData) }}
          </span>

          <!-- Slot indicator + time + group -->
          <div class="flex items-center gap-2 flex-wrap">
            <template v-if="isInventoryMode">
              <UIcon name="i-lucide-box" class="size-3 text-primary" />
              <span class="text-xs text-muted">{{ slotLabel }}</span>
            </template>
            <template v-else>
              <CroutonBookingsSlotIndicator
                v-if="locationSlots.length > 0"
                :slots="locationSlots"
                :booked-slot-ids="bookedSlotIds"
                :cancelled-slot-ids="isCancelled ? bookedSlotIds : []"
                :color="locationColor"
                size="sm"
              />
              <span class="text-xs text-muted">{{ slotLabel }}</span>
            </template>

            <!-- Group badge inline -->
            <UBadge
              v-if="booking.group"
              color="neutral"
              variant="subtle"
              size="sm"
            >
              {{ getGroupLabel(booking.group) }}
            </UBadge>
          </div>

          <!-- User info -->
          <div class="flex items-center gap-1 text-xs">
            <div v-if="bookerUser" class="flex items-center gap-1">
              <UPopover>
                <CroutonUsersCardMini :item="bookerUser" name class="cursor-pointer" />
                <template #content>
                  <div class="p-3 space-y-1 text-sm">
                    <div class="font-medium">{{ bookerUser.name }}</div>
                    <div v-if="bookerUser.email" class="text-muted text-xs">{{ bookerUser.email }}</div>
                  </div>
                </template>
              </UPopover>
              <span v-if="booking.createdAt" class="text-muted whitespace-nowrap">on {{ createdDateText }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Email action buttons -->
      <div v-if="isEmailEnabled && emailActions.length > 0" class="flex items-center gap-1 pr-8">
        <UTooltip
          v-for="action in emailActions"
          :key="action.type"
          :text="action.tooltip"
        >
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            :icon="action.icon"
            :loading="sendingEmailType === action.type"
            :disabled="!!sendingEmailType || !action.canSend"
            class="opacity-50 hover:opacity-100"
            @click="emit('resend-email', action.type)"
          />
        </UTooltip>
      </div>
    </div>
  </UCard>
</template>
