import type { SlotItem } from '../types/booking'

/**
 * Utility composable for working with booking slots
 * Handles JSON parsing and slot label resolution
 */
export function useBookingSlots() {
  /**
   * Parse slot IDs from various formats
   * The slot field is stored as JSON string in DB: '["slot-1"]' or '["slot-1", "slot-2"]'
   */
  function parseSlotIds(slot: string | string[] | null | undefined): string[] {
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
   * Parse location slots from JSON string or array
   */
  function parseLocationSlots(location: { slots?: SlotItem[] | string | null } | null | undefined): SlotItem[] {
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
  function getSlotLabel(slotId: string, slots: SlotItem[]): string {
    const slot = slots.find(s => s.id === slotId)
    return slot?.label || slot?.value || slotId
  }

  /**
   * Get all slot labels for booked slot IDs
   */
  function getSlotLabels(bookedSlotIds: string[], slots: SlotItem[]): string[] {
    return bookedSlotIds.map(id => getSlotLabel(id, slots))
  }

  /**
   * Get slot by ID
   */
  function getSlot(slotId: string, slots: SlotItem[]): SlotItem | undefined {
    return slots.find(s => s.id === slotId)
  }

  return {
    parseSlotIds,
    parseLocationSlots,
    getSlotLabel,
    getSlotLabels,
    getSlot,
  }
}
