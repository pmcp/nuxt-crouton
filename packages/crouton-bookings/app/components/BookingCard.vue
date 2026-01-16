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
// Mobile email panel state
const isEmailPanelOpen = ref(false)
// Activity timeline panel state
const isTimelineOpen = ref(false)

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
  label: string
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
    default: return 'opacity-50 hover:opacity-80'
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

  // Confirmation email - always shown for non-cancelled bookings
  if (!isCancelled.value) {
    const confirmDetail = emailDetails.value.find(e => e.triggerType === 'booking_created')
    // Use booking createdAt as fallback date for confirmation
    const confirmDate = confirmDetail?.sentAt || (props.booking.createdAt ? String(props.booking.createdAt) : null)
    items.push({
      type: 'booking_created',
      icon: confirmDetail?.status === 'sent' ? 'i-lucide-mail-check' : 'i-lucide-mail',
      label: 'Confirm',
      status: confirmDetail?.status || 'not_sent',
      date: formatTimelineDate(confirmDate),
      tooltip: confirmDetail?.status === 'sent' ? 'Resend confirmation' : 'Send confirmation'
    })
  }

  // Reminder - shown for non-cancelled bookings (shows history for past bookings)
  if (!isCancelled.value) {
    const reminderDetail = emailDetails.value.find(e => e.triggerType === 'reminder_before')
    items.push({
      type: 'reminder_before',
      icon: reminderDetail?.status === 'sent' ? 'i-lucide-bell-ring' : 'i-lucide-bell',
      label: 'Reminder',
      status: reminderDetail?.status || 'not_sent',
      date: formatTimelineDate(reminderDetail?.sentAt || reminderDetail?.scheduledFor),
      tooltip: reminderDetail?.status === 'sent' ? 'Resend reminder' : 'Send reminder'
    })
  }

  // Follow-up - shown for non-cancelled bookings
  if (!isCancelled.value) {
    const followupDetail = emailDetails.value.find(e => e.triggerType === 'follow_up_after')
    items.push({
      type: 'follow_up_after',
      icon: followupDetail?.status === 'sent' ? 'i-lucide-message-square-reply' : 'i-lucide-message-square',
      label: 'Follow-up',
      status: followupDetail?.status || 'not_sent',
      date: formatTimelineDate(followupDetail?.sentAt || followupDetail?.scheduledFor),
      tooltip: followupDetail?.status === 'sent' ? 'Resend follow-up' : 'Send follow-up'
    })
  }

  // Cancellation - only if cancelled
  if (isCancelled.value) {
    const cancelDetail = emailDetails.value.find(e => e.triggerType === 'booking_cancelled')
    items.push({
      type: 'booking_cancelled',
      icon: cancelDetail?.status === 'sent' ? 'i-lucide-mail-x' : 'i-lucide-mail-minus',
      label: 'Cancelled',
      status: cancelDetail?.status || 'not_sent',
      date: formatTimelineDate(cancelDetail?.sentAt),
      tooltip: cancelDetail?.status === 'sent' ? 'Resend cancellation' : 'Send cancellation'
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
      body: 'p-0 sm:p-0',
      footer: 'sm:px-0 p-0'
    }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >


    <!-- Main layout: responsive flex with space-between on desktop -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 relative">
      <!-- Slide-out action menu -->
      <div
          class="absolute right-0 top-0 bottom-0 flex flex-col items-center justify-center px-2 bg-elevated/95  transition-transform duration-200 ease-out z-10"
          :class="isHovered ? 'translate-x-0' : 'translate-x-full'"
      >
        <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            icon="i-lucide-pencil"
            @click="emit('edit', booking)"
        />
      </div>
      <!-- Left side: Date badge + Info -->
      <div class="p-2 flex gap-3 flex-1 min-w-0 md:flex-initial">
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
          <div v-if="bookerUser" class="flex items-center gap-1 text-xs text-muted">
            <UPopover>
              <span class="cursor-pointer hover:text-default transition-colors">{{ bookerUser.name }}</span>
              <template #content>
                <div class="p-3 space-y-1 text-sm">
                  <div class="font-medium">{{ bookerUser.name }}</div>
                  <div v-if="bookerUser.email" class="text-muted text-xs">{{ bookerUser.email }}</div>
                </div>
              </template>
            </UPopover>
            <span v-if="booking.createdAt" class="whitespace-nowrap">on {{ createdDateText }}</span>
          </div>
        </div>
      </div>

      <!-- Email timeline (desktop only) -->
      <div
          v-if="isEmailEnabled && timelineItems.length > 0"
          class="hidden md:flex items-center gap-4 pr-14 transition-transform"
          :class="isHovered ? 'translate-x-0' : 'translate-x-10'"
      >
        <UTooltip
          v-for="item in timelineItems"
          :key="item.type"
          :text="item.tooltip"
        >
          <button
            type="button"
            class="flex flex-col items-center gap-1 transition-all cursor-pointer hover:scale-105"
            :class="[
              getTimelineOpacity(item.status),
              sendingEmailType === item.type ? 'animate-pulse' : ''
            ]"
            :disabled="!!sendingEmailType"
            @click="emit('resend-email', item.type)"
          >
            <UIcon :name="item.icon" class="size-5" />
            <span class="text-xs font-medium whitespace-nowrap">{{ item.label }}</span>
            <span class="text-[11px] text-muted whitespace-nowrap">{{ item.date || '—' }}</span>
          </button>
        </UTooltip>
      </div>
    </div>

    <!-- Mobile email panel -->
    <div v-if="isEmailEnabled && timelineItems.length > 0" class="md:hidden mt-4 pt-3 border-t border-muted/20 relative">
      <!-- Trigger button -->
      <UButton
        variant="ghost"
        color="neutral"
        size="sm"
        class="text-muted hover:text-default"
        @click="isEmailPanelOpen = !isEmailPanelOpen"
      >
        <UIcon name="i-lucide-mail" class="size-4" />
        <span>Emails</span>
        <UIcon
          name="i-lucide-chevron-down"
          class="size-3 transition-transform duration-200"
          :class="isEmailPanelOpen ? 'rotate-180' : ''"
        />
      </UButton>

      <!-- Slide-out email buttons -->
      <div
        class="overflow-hidden transition-all duration-200 ease-out"
        :class="isEmailPanelOpen ? 'max-h-28 opacity-100 mt-4' : 'max-h-0 opacity-0'"
      >
        <div class="flex items-center gap-8 pb-2">
          <button
            v-for="item in timelineItems"
            :key="item.type"
            type="button"
            class="flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95"
            :class="[
              getTimelineOpacity(item.status),
              sendingEmailType === item.type ? 'animate-pulse' : ''
            ]"
            :disabled="!!sendingEmailType"
            @click="emit('resend-email', item.type)"
          >
            <UIcon :name="item.icon" class="size-5" />
            <span class="text-xs font-medium whitespace-nowrap">{{ item.label }}</span>
            <span class="text-[11px] text-muted whitespace-nowrap">{{ item.date || '—' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Activity Timeline Section -->
    <template #footer>

      <UCollapsible v-model:open="isTimelineOpen" class="flex flex-col gap-2 w-full">
        <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            class="text-muted hover:text-default w-full justify-start rounded-none"
        >
          <UIcon name="i-lucide-history" class="size-4" />
          <span>Activity</span>
          <UIcon
              name="i-lucide-chevron-down"
              class="size-3 ml-auto transition-transform duration-200"
              :class="isTimelineOpen ? 'rotate-180' : ''"

          />
        </UButton>

        <template #content>
          <!-- Collapsible timeline content -->
          <div class="px-2">
            <CroutonBookingsActivityTimeline :booking="booking" />
          </div>
        </template>
      </UCollapsible>






    </template>
  </UCard>
</template>
