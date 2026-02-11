# Plan: Location Scheduling & Availability Rules

## Context

The bookings package (`packages/crouton-bookings`) currently has no way to mark days or time slots as unavailable. Availability is purely demand-based — a date is only "fully booked" when all slots have existing bookings. There's no concept of "closed on Sundays" or "this slot doesn't run on Wednesdays."

This means admins can't set operating hours, weekly schedules, holidays, or maintenance windows. Customers see every day as bookable.

**Goal**: Add per-location scheduling rules so admins can define when a location is open, which slots run on which days, and block specific date ranges — all without over-engineering.

**Use cases**:
1. "Open Tuesday to Friday" → `openDays: [2,3,4,5]`
2. "Wednesday afternoon closed, morning open" → `slotSchedule: { "slot-afternoon": [1,2,4,5] }`
3. "Closed Dec 24 - Jan 2 for holidays" → `blockedDates` entry with date range

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| No new collections | Everything lives as fields on the existing location — KISS |
| No new API endpoints | Schedule rules travel with location data (already fetched by client) |
| Client-side evaluation | New composable evaluates rules against dates/slots |
| Backward compatible | All new fields default to null, existing locations unchanged |
| Three fields | `openDays`, `slotSchedule`, `blockedDates` cover all use cases |

---

## Schema Changes

**File**: `packages/crouton-bookings/schemas/location.json`

Add three fields in the `scheduling` group (same group as existing `slots`):

### 1. `openDays` (array)

Which days of the week the location accepts bookings. `[0-6]` where 0=Sun, 6=Sat.
Empty/null = open every day. Works for both slot and inventory mode.

```json
"openDays": {
  "type": "array",
  "meta": {
    "label": "Open Days",
    "area": "main",
    "group": "scheduling",
    "help": "Days of the week this location is open. Empty means every day."
  }
}
```

### 2. `slotSchedule` (json)

Per-slot day-of-week availability. Maps slot IDs to arrays of weekday numbers.
Empty/null = all slots follow location `openDays`. Only used in slot mode.

```json
"slotSchedule": {
  "type": "json",
  "meta": {
    "label": "Slot Schedule",
    "area": "main",
    "group": "scheduling",
    "help": "Which days each slot is available. Empty means slots follow open days."
  }
}
```

Data shape: `{ "slot-morning": [1,2,3,4,5], "slot-afternoon": [2,3,4] }`

### 3. `blockedDates` (repeater)

Specific date ranges to block, with optional slot-level restriction.

```json
"blockedDates": {
  "type": "repeater",
  "meta": {
    "label": "Blocked Periods",
    "repeaterComponent": "BlockedDate",
    "addLabel": "Add Blocked Period",
    "sortable": false,
    "area": "main",
    "group": "scheduling"
  }
}
```

Item shape:
```typescript
interface BlockedDateItem {
  id: string
  startDate: string    // YYYY-MM-DD
  endDate: string      // YYYY-MM-DD
  reason?: string      // "Holiday", "Maintenance", etc.
  blockedSlots?: string[]  // empty/null = entire day blocked; populated = only those slots
}
```

---

## Type Changes

**File**: `packages/crouton-bookings/app/types/booking.ts`

- Add `BlockedDateItem` interface (see above)
- Add `SlotSchedule` type alias: `Record<string, number[]>`
- Extend existing `LocationData` interface with:
  - `openDays?: number[] | string | null`
  - `slotSchedule?: SlotSchedule | string | null`
  - `blockedDates?: BlockedDateItem[] | string | null`

---

## New Composable: `useScheduleRules`

**New file**: `packages/crouton-bookings/app/composables/useScheduleRules.ts`

Pure evaluation logic, no API calls, no side effects. Takes `Ref<LocationData | null>` and provides:

| Function | Purpose |
|----------|---------|
| `isLocationOpenOnDate(date)` | Check day-of-week against `openDays` |
| `isDateBlocked(date)` | Check if date falls in any `blockedDates` range (entire day) |
| `isDateUnavailable(date)` | Combines openDays + blockedDates = "not bookable at all" |
| `isSlotAvailableByRules(slotId, date)` | Full check: openDays + slotSchedule + blockedDates |
| `getBlockedReason(date)` | Returns reason string for tooltip ("Closed", "Holiday", etc.) |
| `getRuleBlockedSlotIds(date)` | All slot IDs blocked by rules on a given date |

**Precedence**: A slot is available only if ALL checks pass:
1. Location is open on that day-of-week (`openDays`)
2. Slot is scheduled for that day-of-week (`slotSchedule`, falls back to `openDays`)
3. Date is not in a blocked range, or slot is not in `blockedSlots`

Handles both `Date` and `DateValue` (from `@internationalized/date`) — matching the existing pattern in `useBookingAvailability.ts`.

---

## Existing Composable Modifications

### `useBookingAvailability.ts`

**File**: `packages/crouton-bookings/app/composables/useBookingAvailability.ts`

- Extend `LocationWithInventory` interface to include `openDays`, `slotSchedule`, `blockedDates`
- Instantiate `useScheduleRules(location)` internally
- Modify `isDateFullyBooked()` → also returns true when `isDateUnavailable()`
- Modify `getAvailableSlotsForDate()` → filter out rule-blocked slots before checking demand
- Export schedule rules for component access

### `useBookingCart.ts`

**File**: `packages/crouton-bookings/app/composables/useBookingCart.ts`

- Instantiate `useScheduleRules(selectedLocation)` internally
- Modify `isSlotDisabled(slotId)` → check `isSlotAvailableByRules()` before demand checks
- Modify `isDateFullyBooked(date)` → check `isDateUnavailable()` first
- Modify `canAddToCart` → check `isDateUnavailable()` for inventory mode dates
- Export `isDateUnavailable` for calendar/UI components

### `useCustomerBooking.ts`

**File**: `packages/crouton-bookings/app/composables/useCustomerBooking.ts`

- Instantiate `useScheduleRules(selectedLocation)` internally
- Export `isDateUnavailable` and `getRuleBlockedSlotIds` so Wizard can wire them to Calendar and SlotPicker

---

## New Admin UI Components

All in `packages/crouton-bookings/app/components/`:

### 1. `OpenDaysPicker.vue`

7 toggleable day buttons in a horizontal row (Mon → Sun).

```
[ Mon ] [ Tue ] [ Wed ] [ Thu ] [ Fri ] [ Sat ] [ Sun ]
  on      on      on      on      on     off     off
```

- `v-model: number[]`
- Empty array = all days open (show hint text)
- Use `UButton` toggles with `variant="soft"` when active

### 2. `ScheduleGrid.vue`

Matrix editor: rows = location's slots, columns = days of week. Each cell is a toggle.

```
              Mon  Tue  Wed  Thu  Fri  Sat  Sun
Morning        x    x    x    x    x    -    -
Afternoon      x    x    -    x    x    -    -
Evening        -    -    -    x    x    x    -
```

- `v-model: Record<string, number[]>`
- Needs location's slot list as prop
- Hidden when `inventoryMode` is true
- Shows "All slots follow open days" when empty/null
- Optional row/column "select all" actions

### 3. `BlockedDateInput.vue`

Repeater item component for a single blocked period.

```
Start Date:  [ 2024-12-24 ]
End Date:    [ 2025-01-02 ]
Reason:      [ Holiday closure    ]  (optional)
Block:       (x) Entire day  ( ) Specific slots: [ Morning ] [ Afternoon ]
```

- `v-model: BlockedDateItem`
- Date inputs (native `type="date"` or Nuxt UI date picker)
- Reason: optional `UInput`
- Slot restriction: toggle between "entire day" and multi-select of location slots
- Hide slot selector in inventory mode

---

## Existing Component Modifications

### `Calendar.vue`

**File**: `packages/crouton-bookings/app/components/Calendar.vue`

- Accept optional prop: `isDateUnavailable?: (date: Date) => boolean`
- Visually dim unavailable dates: reduced opacity, muted text, no hover effect, no "+" button
- Show blocked reason tooltip on hover

### `WeekStrip.vue`

**File**: `packages/crouton-bookings/app/components/WeekStrip.vue`

- Accept optional prop: `isDateDisabled?: (date: Date) => boolean`
- Muted visual state for disabled days (lower opacity, no click interaction)

### `CustomerBooking/SlotPicker.vue`

**File**: `packages/crouton-bookings/app/components/CustomerBooking/SlotPicker.vue`

- Accept new prop: `disabledSlotIds?: string[]`
- Rule-disabled slots rendered differently from demand-booked slots (muted "Unavailable" vs "Booked")

### `CustomerBooking/Wizard.vue`

**File**: `packages/crouton-bookings/app/components/CustomerBooking/Wizard.vue`

- Wire `isDateUnavailable` from `useCustomerBooking` into Calendar's date step
- Pass `getRuleBlockedSlotIds(selectedDate)` to SlotPicker as `disabledSlotIds`

---

## Generated Files to Update

In `apps/test-bookings/layers/bookings/collections/locations/`:

| File | Change |
|------|--------|
| `server/database/schema.ts` | Add `openDays`, `slotSchedule`, `blockedDates` columns (jsonColumn) |
| `types.ts` | Add fields to `BookingsLocation` interface |
| `app/composables/useBookingsLocations.ts` | Add to Zod schema, columns config, defaultValues |
| `server/database/queries.ts` | Add JSON post-processing for blockedDates (null → []) |

After schema changes: `npx nuxt db:generate` + `npx nuxt db:migrate`

---

## Implementation Order

### Phase 1: Data Foundation
1. Update `schemas/location.json` — add 3 fields
2. Update `app/types/booking.ts` — add types, extend LocationData
3. Update generated DB schema + types in test-bookings
4. Run migrations

### Phase 2: Core Logic
5. Create `useScheduleRules.ts` composable

### Phase 3: Integration
6. Modify `useBookingAvailability.ts` — integrate schedule rules
7. Modify `useBookingCart.ts` — integrate schedule rules
8. Modify `useCustomerBooking.ts` — expose schedule rules

### Phase 4: Admin UI
9. Create `OpenDaysPicker.vue`
10. Create `ScheduleGrid.vue`
11. Create `BlockedDateInput.vue`
12. Update generated location form/list components

### Phase 5: Customer UI
13. Modify `Calendar.vue` — dim unavailable dates
14. Modify `WeekStrip.vue` — dim disabled days
15. Modify `SlotPicker.vue` — show rule-disabled slots
16. Modify `Wizard.vue` — wire everything together

### Phase 6: Polish
17. Add i18n keys (en, nl, fr) for schedule labels
18. Run `npx nuxt typecheck`
19. Manual testing: admin form, customer wizard, calendar, both modes

---

## Inventory Mode Handling

| Field | Behavior in Inventory Mode |
|-------|---------------------------|
| `openDays` | Fully applies — location closed = no inventory bookings |
| `slotSchedule` | Ignored — no slots in inventory mode |
| `blockedDates` | Applies for date range check, `blockedSlots` sub-field ignored |
| `ScheduleGrid` | Hidden in admin form |
| `BlockedDateInput` | Slot selector hidden |

---

## Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| Empty `openDays` | Open every day (backward compatible default) |
| Slot not in `slotSchedule` | Follows location `openDays` |
| `openDays` overrides `slotSchedule` | If location is closed, slots can't override |
| "all-day" synthetic slot | Follows location rules; blocked if any individual slot is blocked |
| Date format | All use `YYYY-MM-DD` local time (matches existing `normalizeToDateKey`) |
| No server-side enforcement | Rules are client-side; server trusts client (future: add validation to batch endpoint) |
| Existing locations | No schedule fields → everything works as before |

---

## Verification Checklist

- [ ] Admin: create location with `openDays=[1,2,3,4,5]`, verify Sat/Sun disabled in customer calendar
- [ ] Admin: set `slotSchedule` to exclude Wednesday for one slot, verify slot disabled on Wed
- [ ] Admin: add blocked date range (Dec 24-Jan 2), verify dates disabled in customer calendar
- [ ] Admin: blocked date range with specific `blockedSlots`, verify only those slots disabled
- [ ] Inventory mode: verify `openDays` blocks dates, `slotSchedule` is ignored
- [ ] Existing locations (no schedule fields): verify everything works as before
- [ ] Run `npx nuxt typecheck` — no errors

---

## Key Files Reference

| File | Role |
|------|------|
| `packages/crouton-bookings/schemas/location.json` | Schema definition (add 3 fields) |
| `packages/crouton-bookings/app/types/booking.ts` | Type definitions (extend) |
| `packages/crouton-bookings/app/composables/useScheduleRules.ts` | **NEW** — core rule evaluation |
| `packages/crouton-bookings/app/composables/useBookingAvailability.ts` | Integrate rules into availability |
| `packages/crouton-bookings/app/composables/useBookingCart.ts` | Integrate rules into cart/booking flow |
| `packages/crouton-bookings/app/composables/useCustomerBooking.ts` | Expose rules to wizard |
| `packages/crouton-bookings/app/components/Calendar.vue` | Dim unavailable dates |
| `packages/crouton-bookings/app/components/WeekStrip.vue` | Dim disabled days |
| `packages/crouton-bookings/app/components/CustomerBooking/SlotPicker.vue` | Show rule-disabled slots |
| `packages/crouton-bookings/app/components/CustomerBooking/Wizard.vue` | Wire rules to UI |
| `apps/test-bookings/layers/bookings/collections/locations/server/database/schema.ts` | DB migration |