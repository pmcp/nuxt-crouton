import type { SlotItem } from '../types/booking'

/**
 * Parse slot IDs from various formats.
 * The slot field is stored as JSON string in DB: '["slot-1"]' or '["slot-1", "slot-2"]'
 */
export function parseSlotIds(slot: string | string[] | null | undefined): string[] {
  if (!slot) return []
  if (Array.isArray(slot)) return slot
  try {
    const parsed = JSON.parse(slot)
    return Array.isArray(parsed) ? parsed : []
  }
  catch {
    return []
  }
}

/**
 * Parse location slots from JSON string or array.
 * Shared utility used by useBookingCart, useBookingAvailability, and useScheduleRules.
 */
export function parseLocationSlots(location: { slots?: SlotItem[] | string | null } | null | undefined): SlotItem[] {
  if (!location?.slots) return []
  if (Array.isArray(location.slots)) return location.slots
  try {
    const parsed = JSON.parse(location.slots)
    return Array.isArray(parsed) ? parsed : []
  }
  catch {
    return []
  }
}

/**
 * Get human-readable label for a slot ID
 */
export function getSlotLabel(slotId: string, slots: SlotItem[]): string {
  const slot = slots.find(s => s.id === slotId)
  return slot?.label || slot?.value || slotId
}

/**
 * Utility composable for working with booking slots.
 * Wraps the standalone functions for composable-style usage.
 */
export function useBookingSlots() {
  return {
    parseSlotIds,
    parseLocationSlots,
    getSlotLabel,
  }
}
