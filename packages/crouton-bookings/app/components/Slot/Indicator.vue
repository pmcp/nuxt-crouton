<script setup lang="ts">
import type { Booking } from '../../types/booking'

interface SlotItem {
  id: string
  label?: string
}

interface Props {
  slots: SlotItem[]
  bookedSlotIds?: string[]
  /** Slot IDs that belong to cancelled bookings (shown in red) */
  cancelledSlotIds?: string[]
  /** Bookings data for hover highlighting */
  bookings?: Booking[]
  /** Color to use for unfilled slots and booked slots (from location) */
  color?: string
  /** Optional override color for booked slots (e.g., red for cancelled) */
  bookedColor?: string
  /** Color for cancelled slots */
  cancelledColor?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** 'dots' = fixed-size circles, 'bars' = flex-grow to fill width */
  variant?: 'dots' | 'bars'
}

const props = withDefaults(defineProps<Props>(), {
  bookedSlotIds: () => [],
  cancelledSlotIds: () => [],
  bookings: () => [],
  color: '#3b82f6',
  bookedColor: undefined,
  cancelledColor: '#ef4444',
  size: 'md',
  variant: 'bars',
})

const emit = defineEmits<{
  /** Emitted when hovering over a booked slot, with the booking ID */
  hoverBooking: [bookingId: string | null]
}>()

const { parseSlotIds } = useBookingSlots()

const dotSizeClasses = {
  xs: 'size-1.5',
  sm: 'size-2',
  md: 'size-3',
  lg: 'size-4',
}

const barHeightClasses = {
  xs: 'h-1.5',
  sm: 'h-2',
  md: 'h-2.5',
  lg: 'h-3',
}

const gapClasses = {
  xs: 'gap-[2px]',
  sm: 'gap-[3px]',
  md: 'gap-1',
  lg: 'gap-1.5',
}

function isBooked(slotId: string): boolean {
  // Check if this specific slot is booked OR if "all-day" is booked (means all slots are filled)
  return props.bookedSlotIds?.includes(slotId) || props.bookedSlotIds?.includes('all-day') || false
}

function isCancelled(slotId: string): boolean {
  // Check if this specific slot is cancelled OR if "all-day" is cancelled
  return props.cancelledSlotIds?.includes(slotId) || props.cancelledSlotIds?.includes('all-day') || false
}

// Get the color for a booked slot (red if cancelled, bookedColor if provided, otherwise location color)
function getBookedSlotColor(slotId: string): string {
  if (isCancelled(slotId)) return props.cancelledColor
  return props.bookedColor || props.color
}

// Get booking for a specific slot
function getBookingForSlot(slotId: string): Booking | undefined {
  return props.bookings?.find((booking) => {
    const slotIds = parseSlotIds(booking.slot)
    return slotIds.includes(slotId) || slotIds.includes('all-day')
  })
}

// Handle hover on a slot
function onSlotHover(slotId: string) {
  const booking = getBookingForSlot(slotId)
  emit('hoverBooking', booking?.id ?? null)
}

function onSlotLeave() {
  emit('hoverBooking', null)
}

// Compute unfilled slot color (same hue, 25% opacity)
function getUnfilledColor(): string {
  return props.color
}
</script>

<template>
  <div
    class="flex"
    :class="[
      gapClasses[size],
      variant === 'bars' ? 'w-full' : 'justify-center',
    ]"
  >
    <div
      v-for="slot in slots"
      :key="slot.id"
      class="rounded-full transition-colors"
      :class="[
        variant === 'dots' ? dotSizeClasses[size] : ['flex-1', barHeightClasses[size]],
        isBooked(slot.id) ? 'cursor-pointer' : '',
      ]"
      :style="{
        backgroundColor: isBooked(slot.id) ? getBookedSlotColor(slot.id) : getUnfilledColor(),
        opacity: isBooked(slot.id) ? 1 : 0.15,
      }"
      :title="slot.label"
      @mouseenter="isBooked(slot.id) && onSlotHover(slot.id)"
      @mouseleave="onSlotLeave"
    />
  </div>
</template>
