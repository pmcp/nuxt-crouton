import type { EventChange } from '../types/events'

/** Parse a JSON-stringified event value for display */
export function parseEventValue(value: string | null): unknown {
  if (value === null) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

/** Format any value for display */
export function formatEventValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  return String(value)
}

/** Check if a parsed value is complex (object/array) */
export function isComplexValue(value: unknown): boolean {
  return typeof value === 'object' && value !== null
}

/** Get full display info for a change entry */
export function getChangeDisplay(change: EventChange) {
  const oldVal = parseEventValue(change.oldValue)
  const newVal = parseEventValue(change.newValue)

  return {
    field: change.fieldName,
    oldValue: formatEventValue(oldVal),
    newValue: formatEventValue(newVal),
    isOldComplex: isComplexValue(oldVal),
    isNewComplex: isComplexValue(newVal),
    hasOld: change.oldValue !== null,
    hasNew: change.newValue !== null,
  }
}

/** Truncate long values for inline display */
export function truncateValue(value: string, maxLength = 50): string {
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength) + '...'
}
