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
}

const props = withDefaults(defineProps<Props>(), {
  bookedSlotIds: () => [],
  cancelledSlotIds: () => [],
  bookings: () => [],
  color: '#3b82f6',
  bookedColor: undefined,
  cancelledColor: '#ef4444',
  size: 'md',
})

const emit = defineEmits<{
  /** Emitted when hovering over a booked slot, with the booking ID */
  hoverBooking: [bookingId: string | null]
}>()

const { parseSlotIds } = useBookingSlots()

const sizeClasses = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
}

const gapClasses = {
  xs: 'gap-1',
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-2',
}

function isBooked(slotId: string): boolean {
  return props.bookedSlotIds?.includes(slotId) ?? false
}

function isCancelled(slotId: string): boolean {
  return props.cancelledSlotIds?.includes(slotId) ?? false
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
  <div class="flex items-center justify-center" :class="gapClasses[size]">
    <div
      v-for="slot in slots"
      :key="slot.id"
      class="rounded-full transition-colors"
      :class="[sizeClasses[size], isBooked(slot.id) ? 'cursor-pointer' : '']"
      :style="{
        backgroundColor: isBooked(slot.id) ? getBookedSlotColor(slot.id) : getUnfilledColor(),
        opacity: isBooked(slot.id) ? 1 : 0.25,
      }"
      :title="slot.label"
      @mouseenter="isBooked(slot.id) && onSlotHover(slot.id)"
      @mouseleave="onSlotLeave"
    />
  </div>
</template>
