<script setup lang="ts">
import type { Booking, SlotItem, EmailTriggerType } from '../types/booking'

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
}>()

const { t } = useI18n()
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

// Email stats helpers
const emailStats = computed(() => props.booking.emailStats)
const emailActions = computed(() => props.booking.emailActions || [])

const hasEmailData = computed(() => {
  return isEmailEnabled.value && emailStats.value?.total
})

const emailStatusColor = computed((): 'success' | 'warning' | 'error' | 'neutral' => {
  if (!emailStats.value?.total) return 'neutral'
  if (emailStats.value.failed > 0) return 'error'
  if (emailStats.value.pending > 0) return 'warning'
  if (emailStats.value.sent === emailStats.value.total) return 'success'
  return 'neutral'
})

const emailStatusIcon = computed(() => {
  if (!emailStats.value?.total) return 'i-lucide-mail'
  if (emailStats.value.failed > 0) return 'i-lucide-mail-x'
  if (emailStats.value.pending > 0) return 'i-lucide-mail-question'
  if (emailStats.value.sent === emailStats.value.total) return 'i-lucide-mail-check'
  return 'i-lucide-mail'
})

const emailStatusText = computed(() => {
  if (!emailStats.value?.total) return ''
  if (emailStats.value.failed > 0) {
    return t('bookings.meta.emailsFailed', { failed: emailStats.value.failed, total: emailStats.value.total })
  }
  return t('bookings.meta.emailsSent', { sent: emailStats.value.sent, total: emailStats.value.total })
})
</script>

<template>
  <UCard
    variant="soft"
    :ui="{
      root: [
        'group transition-all duration-200',
        isCancelled ? 'opacity-60' : '',
        highlighted ? 'ring-1 ring-primary/30 bg-primary/[0.02]' : ''
      ],
      body: 'p-2'
    }"
  >
    <div class="flex items-center gap-3">
      <!-- Date badge (clickable to navigate calendar) -->
      <button
        type="button"
        class="cursor-pointer hover:scale-105 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
        @click="emit('date-click', new Date(booking.date))"
      >
        <CroutonBookingsDateBadge
          :date="booking.date"
          :variant="isCancelled ? 'error' : 'primary'"
          :highlighted="highlighted"
          :highlight-color="locationColor"
        />
      </button>

      <!-- Content -->
      <div class="flex-1 flex flex-col gap-1 min-w-0">
        <!-- Location title -->
        <span
          class="text-sm font-medium truncate"
          :class="{ 'line-through text-muted': isCancelled }"
        >
          {{ booking.locationData?.title || 'Unknown Location' }}
        </span>

        <!-- Slot indicator or inventory -->
        <div class="flex items-center gap-2">
          <template v-if="isInventoryMode">
            <div class="flex items-center gap-1.5">
              <UIcon name="i-lucide-box" class="size-3 text-primary" />
              <span class="text-xs text-muted">{{ slotLabel }}</span>
            </div>
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

        <!-- Group badge if present -->
        <UBadge
          v-if="booking.group"
          color="neutral"
          variant="subtle"
          size="xs"
          class="mt-0.5 w-fit"
        >
          {{ getGroupLabel(booking.group) }}
        </UBadge>

        <!-- Email stats (when email enabled and data available) -->
        <div
          v-if="hasEmailData"
          class="flex items-center gap-1 text-xs mt-0.5"
          :class="{
            'text-success': emailStatusColor === 'success',
            'text-warning': emailStatusColor === 'warning',
            'text-error': emailStatusColor === 'error',
            'text-muted': emailStatusColor === 'neutral',
          }"
        >
          <UIcon :name="emailStatusIcon" class="size-3" />
          <span>{{ emailStatusText }}</span>
        </div>
      </div>

      <!-- Email actions (right side) -->
      <div
        v-if="isEmailEnabled && emailActions.length > 0"
        class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <UTooltip
          v-for="action in emailActions"
          :key="action.triggerType"
          :text="action.label"
        >
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            :icon="action.icon"
            :loading="sendingEmailType === action.triggerType"
            :disabled="!!sendingEmailType"
            class="transition-all duration-200 hover:scale-110 hover:text-primary"
            @click="emit('resend-email', action.triggerType)"
          />
        </UTooltip>
      </div>
    </div>
  </UCard>
</template>
