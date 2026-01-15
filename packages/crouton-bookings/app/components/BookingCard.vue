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

// Timeline item for email status display
interface TimelineItem {
  type: EmailTriggerType
  icon: string
  status: 'sent' | 'pending' | 'failed' | 'not_sent'
  date: string | null
  tooltip: string
}

// Get opacity class based on email status
function getTimelineOpacity(status: TimelineItem['status']): string {
  switch (status) {
    case 'sent': return 'opacity-100'
    case 'pending': return 'opacity-70'
    case 'failed': return 'opacity-100 text-error'
    default: return 'opacity-30 hover:opacity-60'
  }
}

// Format timeline date from ISO string
function formatTimelineDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' }).format(date)
}

// Build timeline items from email details
const timelineItems = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = []
  const bookingDate = props.booking.date ? new Date(props.booking.date) : null
  const now = new Date()
  const isPast = bookingDate ? bookingDate < now : false

  // Confirmation email - always shown
  const confirmDetail = emailDetails.value.find(e => e.triggerType === 'booking_created')
  items.push({
    type: 'booking_created',
    icon: confirmDetail?.status === 'sent' ? 'i-lucide-mail-check' : 'i-lucide-mail',
    status: confirmDetail?.status || 'not_sent',
    date: formatTimelineDate(confirmDetail?.sentAt),
    tooltip: confirmDetail?.status === 'sent' ? 'Resend confirmation' : 'Send confirmation'
  })

  // Reminder - only for future bookings (not cancelled)
  if (!isPast && !isCancelled.value) {
    const reminderDetail = emailDetails.value.find(e => e.triggerType === 'reminder_before')
    items.push({
      type: 'reminder_before',
      icon: reminderDetail?.status === 'sent' ? 'i-lucide-bell-ring' : 'i-lucide-bell',
      status: reminderDetail?.status || 'not_sent',
      date: formatTimelineDate(reminderDetail?.sentAt || reminderDetail?.scheduledFor),
      tooltip: reminderDetail?.status === 'sent' ? 'Resend reminder' : 'Send reminder'
    })
  }

  // Cancellation - only if cancelled
  if (isCancelled.value) {
    const cancelDetail = emailDetails.value.find(e => e.triggerType === 'booking_cancelled')
    items.push({
      type: 'booking_cancelled',
      icon: cancelDetail?.status === 'sent' ? 'i-lucide-mail-x' : 'i-lucide-mail-minus',
      status: cancelDetail?.status || 'not_sent',
      date: formatTimelineDate(cancelDetail?.sentAt),
      tooltip: cancelDetail?.status === 'sent' ? 'Resend cancellation' : 'Send cancellation'
    })
  }

  // Follow-up - only for past bookings (not cancelled)
  if (isPast && !isCancelled.value) {
    const followupDetail = emailDetails.value.find(e => e.triggerType === 'follow_up_after')
    items.push({
      type: 'follow_up_after',
      icon: followupDetail?.status === 'sent' ? 'i-lucide-message-square-reply' : 'i-lucide-message-square',
      status: followupDetail?.status || 'not_sent',
      date: formatTimelineDate(followupDetail?.sentAt || followupDetail?.scheduledFor),
      tooltip: followupDetail?.status === 'sent' ? 'Resend follow-up' : 'Send follow-up'
    })
  }

  return items
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

      <!-- Email timeline -->
      <div v-if="isEmailEnabled && timelineItems.length > 0" class="flex items-center gap-3 pr-8">
        <UTooltip
          v-for="item in timelineItems"
          :key="item.type"
          :text="item.tooltip"
        >
          <button
            type="button"
            class="flex flex-col items-center gap-0.5 transition-all cursor-pointer"
            :class="[
              getTimelineOpacity(item.status),
              sendingEmailType === item.type ? 'animate-pulse' : ''
            ]"
            :disabled="!!sendingEmailType"
            @click="emit('resend-email', item.type)"
          >
            <UIcon :name="item.icon" class="size-4" />
            <span class="text-[10px] text-muted whitespace-nowrap">{{ item.date || '—' }}</span>
          </button>
        </UTooltip>
      </div>
    </div>
  </UCard>
</template>
