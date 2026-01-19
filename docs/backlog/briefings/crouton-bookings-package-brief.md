# Brief: Extract crouton-bookings Package

**Created**: 2024-12-18
**Status**: Planning Complete
**Owner**: TBD

---

## Executive Summary

Extract the booking system from `crouton-bookings` app into a reusable package `@fyit/crouton-bookings` in the nuxt-crouton monorepo. The package will support both slot-based bookings (courts, rooms) and inventory-based reservations (equipment pools, rentals).

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Tasks | 0 / 12 completed |
| Phases | 4 |
| Priority | High |

---

## Decisions Made

| Decision | Choice |
|----------|--------|
| Table names | Convention-only (expects `bookingsX` tables) |
| Email | Opt-in module via config |
| Booking modes | Slot + Inventory (v1) |
| Future modes | Time-range/Events deferred to v2 |

---

## Task Tracker

### Phase 1: Package Foundation

- [ ] **1.1** Create package skeleton at `/nuxt-crouton/packages/crouton-bookings/`
  - package.json, nuxt.config.ts, build.config.ts
  - Follow pattern from `nuxt-crouton-supersaas`

- [ ] **1.2** Copy schemas from `crouton-bookings/schemas/` to package
  - booking.json, location.json, settings.json
  - email-template.json, email-log.json

- [ ] **1.3** Update location schema for inventory mode
  - Add `inventoryMode: boolean`
  - Add `quantity: number`

### Phase 2: Core Business Logic

- [ ] **2.1** Extract `useBookingAvailability.ts`
  - From: `layers/bookings/collections/bookings/app/composables/`
  - Adapt for both slot and inventory modes

- [ ] **2.2** Extract `useBookingCart.ts`
  - From: `layers/customer-booking/app/composables/`
  - Update to support inventory mode (no slot selection)

- [ ] **2.3** Extract `useCustomerBooking.ts` and `useBookingsSettings.ts`
  - From: `layers/customer-booking/` and `layers/bookings/collections/settings/`

- [ ] **2.4** Create package API endpoints under `/api/cb/`
  - `availability.get.ts`
  - `customer-bookings.get.ts`
  - `customer-bookings-batch.post.ts`
  - `customer-locations.get.ts`

### Phase 3: Components

- [ ] **3.1** Extract customer-facing components
  - BookingDrawer, BookingFloatingButton
  - FloatingIslandNav, FloatingIslandSidebar
  - WeekStrip, DateBadge
  - All BookingSidebar/* components
  - All CustomerBooking/* components
  - MyBookings/List

- [ ] **3.2** Extract admin components
  - CalendarWithAvailability
  - SlotSelectWithAvailability
  - Card, SlotCell

- [ ] **3.3** Adapt components for inventory mode
  - Hide slot picker when `inventoryMode: true`
  - Show quantity remaining instead of slot availability

### Phase 4: Integration & Testing

- [ ] **4.1** Add email module (opt-in)
  - Conditional based on `croutonBookings.email.enabled`
  - Integrate with `@fyit/crouton-email`

- [ ] **4.2** Update crouton-bookings app to use package (dogfooding)
  - Replace duplicated code with package extends
  - Verify all functionality works

- [ ] **4.3** Documentation
  - README with setup instructions
  - Example crouton.config.js
  - Document both slot and inventory modes

---

## Architecture

### Package Structure

```
nuxt-crouton/packages/crouton-bookings/
├── package.json
├── nuxt.config.ts
├── module.ts
├── schemas/
│   ├── booking.json
│   ├── location.json
│   ├── settings.json
│   ├── email-template.json
│   └── email-log.json
├── app/
│   ├── composables/
│   │   ├── useBookingAvailability.ts
│   │   ├── useBookingCart.ts
│   │   ├── useCustomerBooking.ts
│   │   └── useBookingsSettings.ts
│   ├── components/
│   │   ├── Booking/           # Admin
│   │   ├── CustomerBooking/   # Customer wizard
│   │   ├── BookingSidebar/    # Sidebar panels
│   │   └── MyBookings/        # User's bookings
│   └── types/
├── server/
│   ├── api/cb/teams/[id]/     # Business logic APIs
│   └── utils/
└── i18n/locales/
```

### Two Booking Modes

**Slot Mode (Default)**
```
Location → Slots → User picks date + slot → Booking
"Tennis Court A" → ["9-10am", "10-11am"] → Jan 15 + 9-10am
```

**Inventory Mode**
```
Resource → Quantity → User picks date → Booking
"Bikes" → 5 → Jan 15 → (pool decrements)
```

### Configuration

```ts
// User's nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton',
    '@fyit/crouton-bookings',
    './layers/bookings'  // Generated layer
  ],
  croutonBookings: {
    email: { enabled: true }
  }
})
```

---

## User Workflow

1. **Install package**: `pnpm add @fyit/crouton-bookings`
2. **Copy schemas**: From package to local `./schemas/`
3. **Configure crouton**: Use `bookings` as layer name in crouton.config.js
4. **Generate**: `crouton config`
5. **Extend**: Add package to nuxt.config extends
6. **Done**: Booking system ready

---

## Key Files to Extract

### From `layers/bookings/collections/bookings/`
- `app/composables/useBookingAvailability.ts`
- `app/components/CalendarWithAvailability.vue`
- `app/components/SlotSelectWithAvailability.vue`
- `app/components/Card.vue`
- `app/components/SlotCell.vue`
- `server/api/teams/[id]/bookings-bookings/availability.get.ts`
- `server/api/teams/[id]/bookings-bookings/[bookingId]/resend-email.post.ts`

### From `layers/customer-booking/`
- `app/composables/useBookingCart.ts` (575 lines)
- `app/composables/useCustomerBooking.ts`
- `app/components/**/*` (all 20+ components)
- `app/types/booking.ts`
- `server/api/teams/[id]/customer-*.ts` (3 endpoints)

### From `layers/bookings/collections/settings/`
- `app/composables/useBookingsSettings.ts`

---

## Convention Requirements

Package expects tables named:
- `bookingsBookings`
- `bookingsLocations`
- `bookingsSettings`
- `bookingsEmailtemplates` (if email enabled)
- `bookingsEmaillogs` (if email enabled)

User MUST generate collections using `bookings` as the layer name in crouton.config.js.

---

## Success Criteria

- [ ] User can install + generate + extend → working booking system
- [ ] Both slot and inventory modes work
- [ ] crouton-bookings app uses package (no duplicated code)
- [ ] Email can be enabled/disabled without errors
- [ ] TypeScript types work correctly
- [ ] All existing functionality preserved

---

## Related Documents

- Full plan: `/Users/pmcp/.claude/plans/ethereal-knitting-nebula.md`
- CLI docs: `/nuxt-crouton/packages/nuxt-crouton-cli/CLAUDE.md`
- Similar package: `/nuxt-crouton/packages/nuxt-crouton-supersaas/`

---

## Notes for Agents

1. **Always run `npx nuxt typecheck`** after making changes
2. **Convention is critical**: Package imports assume `bookings` layer name
3. **Inventory mode is new**: Current app only has slot mode, need to implement inventory logic
4. **Email uses existing package**: Integrate with `@fyit/crouton-email`
5. **Test by dogfooding**: Update crouton-bookings app to use the package
