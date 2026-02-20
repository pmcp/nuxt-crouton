/**
 * Shared date normalization utilities for crouton packages.
 *
 * These functions are duplicated across crouton-bookings composables and server
 * handlers. Centralising them here removes the drift risk and provides a single
 * source of truth for YYYY-MM-DD / YYYY-MM key generation.
 *
 * NOTE: All "local date" helpers use the JavaScript local timezone (getFullYear /
 * getMonth / getDate), which matches how booking dates are displayed to the user.
 * Do NOT switch to UTC helpers unless the booking domain explicitly requires UTC.
 */

/**
 * Minimal interface for @internationalized/date DateValue objects so we can
 * accept them without adding a hard dependency on that package.
 */
export interface DateValueLike {
  year: number
  month: number
  day: number
}

/**
 * Return true if the value is a DateValueLike (from @internationalized/date).
 * Native Date objects will fail this check.
 */
function isDateValueLike(date: Date | DateValueLike): date is DateValueLike {
  return !(date instanceof Date) && 'year' in date && 'month' in date && 'day' in date
}

/**
 * Normalize a Date or @internationalized/date DateValue to a YYYY-MM-DD string.
 *
 * Uses local-timezone year/month/day for Date objects so the key matches what
 * the user sees in the calendar (avoids UTC day-boundary shifts).
 *
 * Equivalent of the private `normalizeToDateKey`, `toDateKey`, and
 * `toLocalDateKey` helpers scattered across crouton-bookings composables.
 *
 * @example
 *   toDateKey(new Date('2024-07-04'))        // "2024-07-04"
 *   toDateKey({ year: 2024, month: 7, day: 4 }) // "2024-07-04"
 */
export function toDateKey(date: Date | DateValueLike): string {
  if (isDateValueLike(date)) {
    return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
  }
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Return a YYYY-MM month key for a Date (local timezone).
 *
 * Used for monthly booking limit enforcement: grouping bookings by calendar month
 * as the user sees it.
 *
 * @example
 *   toMonthKey(new Date('2024-07-15')) // "2024-07"
 */
export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Check whether two dates represent the same calendar day (local timezone).
 *
 * @example
 *   isSameDay(new Date('2024-07-04T00:00'), new Date('2024-07-04T23:59')) // true
 *   isSameDay(new Date('2024-07-04'), new Date('2024-07-05'))             // false
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return toDateKey(date1) === toDateKey(date2)
}

/**
 * Extract the YYYY-MM-DD portion from a date that may already be an ISO string
 * or a Date object. Handles the pattern `b.date.substring(0, 10)` found in
 * booking list comparisons.
 *
 * @example
 *   toDateString('2024-07-04T12:00:00.000Z') // "2024-07-04"
 *   toDateString(new Date('2024-07-04'))      // "2024-07-04"
 */
export function toDateString(date: string | Date): string {
  if (typeof date === 'string') {
    return date.substring(0, 10)
  }
  return toDateKey(date)
}

/**
 * Build the start-of-month and end-of-month Date boundaries for a given YYYY-MM
 * string. Returns midnight of the 1st and 23:59:59.999 of the last day.
 *
 * Used by the server-side monthly booking count endpoint and batch booking limit
 * enforcement.
 *
 * @example
 *   const { monthStart, monthEnd } = monthBounds('2024-07')
 */
export function monthBounds(monthKey: string): { monthStart: Date; monthEnd: Date } {
  const [year, month] = monthKey.split('-').map(Number)
  return {
    monthStart: new Date(year!, month! - 1, 1),
    monthEnd: new Date(year!, month!, 0, 23, 59, 59, 999),
  }
}

/**
 * Build the start-of-month and end-of-month Date boundaries for the current
 * calendar month (local timezone).
 */
export function currentMonthBounds(): { monthStart: Date; monthEnd: Date } {
  const now = new Date()
  return {
    monthStart: new Date(now.getFullYear(), now.getMonth(), 1),
    monthEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  }
}
