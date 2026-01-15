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

// Format created date (e.g., "Jan 5")
const createdDateText = computed(() => {
  if (!props.booking.createdAt) return ''
  return formatShortDate(String(props.booking.createdAt))
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
      class="absolute right-0 top-0 bottom-0 flex flex-col items-center justify-center gap-0.5 px-1.5 bg-elevated/95 backdrop-blur-sm transition-transform duration-200 ease-out"
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

    <div class="flex gap-3">
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

      <!-- Main content -->
      <div class="flex-1 min-w-0 flex flex-col gap-2">
        <!-- Top row: Location info -->
        <div class="flex flex-col gap-0.5 min-w-0">
          <!-- Location name -->
          <span
            class="text-sm font-medium truncate"
            :class="{ 'line-through text-muted': isCancelled }"
          >
            {{ booking.locationData?.title || 'Unknown Location' }}
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
        </div>

        <!-- Bottom row: User info + Email status -->
        <div class="flex items-center gap-4 flex-wrap">
          <!-- User info (compact) -->
          <div v-if="bookerUser" class="flex items-center gap-1 text-xs">
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

          <!-- Email status (compact) -->
          <template v-if="hasEmailStatus">
            <USeparator orientation="vertical" class="h-4" />
            <div class="flex items-center gap-3 text-xs">
              <!-- Confirmation -->
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
                  :name="confirmationStatus?.status === 'sent' ? 'i-lucide-mail-check' : confirmationStatus?.status === 'failed' ? 'i-lucide-mail-x' : 'i-lucide-mail'"
                  class="size-3.5"
                />
                <span>{{ confirmationText }}</span>
              </div>

              <!-- Reminder -->
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
                  class="size-3.5"
                />
                <span>{{ reminderText }}</span>
              </div>
            </div>
          </template>

          <!-- Send email dropdown -->
          <UDropdownMenu
            v-if="hasEmailDropdown"
            :items="emailDropdownItems"
            :ui="{ content: 'min-w-40' }"
          >
            <UButton
              variant="ghost"
              color="neutral"
              size="2xs"
              icon="i-lucide-send"
              :loading="!!sendingEmailType"
            >
              Send
            </UButton>
          </UDropdownMenu>
        </div>
      </div>
    </div>
  </UCard>
</template>
