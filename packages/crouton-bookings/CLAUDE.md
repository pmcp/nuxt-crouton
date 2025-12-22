# CLAUDE.md - @friendlyinternet/crouton-bookings

## Package Purpose

Booking system layer for Nuxt applications that provides both slot-based bookings (courts, rooms, appointments) and inventory-based reservations (equipment, rentals). Works as a Nuxt layer that integrates with `@friendlyinternet/nuxt-crouton` and `@friendlyinternet/nuxt-crouton-auth`.

## Key Files

| File | Purpose |
|------|---------|
| `nuxt.config.ts` | Layer configuration, component registration, i18n setup |
| `app/composables/useBookingAvailability.ts` | Check slot/inventory availability |
| `app/composables/useBookingCart.ts` | Shopping cart for bookings |
| `app/composables/useCustomerBooking.ts` | Complete customer booking flow |
| `app/composables/useBookingsSettings.ts` | Team booking settings |
| `app/composables/useBookingEmail.ts` | Email functionality (opt-in) |
| `app/components/BookingSidebar/` | Sidebar booking components |
| `app/components/CustomerBooking/` | Full-page booking wizard |
| `app/components/Admin/` | Admin booking management |
| `app/types/booking.ts` | TypeScript type definitions |
| `server/api/crouton-bookings/` | API endpoints |
| `server/utils/booking-emails.ts` | Email utilities |
| `schemas/` | JSON schema definitions |

## Architecture

### Components (Prefixed: CroutonBooking)

```
CroutonBooking
├── BookingSidebar/
│   ├── Panel.vue       - Main sidebar container
│   ├── Form.vue        - Date/slot selection
│   ├── Cart.vue        - Shopping cart
│   ├── MyBookings.vue  - User's bookings list
│   ├── BookingItem.vue - Single booking display
│   ├── LocationNav.vue - Location navigation
│   ├── LocationContent.vue - Location details
│   └── LocationMap.vue - Optional map display
├── CustomerBooking/
│   ├── Wizard.vue      - Full-page wizard
│   ├── LocationCard.vue - Location selection
│   ├── SlotPicker.vue  - Time slot picker
│   └── Confirmation.vue - Booking confirmation
├── Admin/
│   ├── Calendar.vue    - Admin calendar view
│   ├── SlotSelect.vue  - Admin slot selection
│   ├── Card.vue        - Admin booking card
│   └── SlotCell.vue    - Calendar slot cell
├── Slot/
│   ├── Indicator.vue   - Visual slot indicator
│   └── SingleIndicator.vue - Single slot dot
├── WeekStrip.vue       - Week date navigation
├── DateBadge.vue       - Date display badge
├── BookingDrawer.vue   - Mobile booking drawer
├── BookingFloatingButton.vue - Mobile floating action
├── FloatingIslandNav.vue - Mobile navigation
├── FloatingIslandSidebar.vue - Mobile sidebar
└── MyBookings/List.vue - Admin bookings list
```

### API Endpoints

| Path | Method | Purpose |
|------|--------|---------|
| `/api/crouton-bookings/teams/[id]/availability` | GET | Get booked slots for date range |
| `/api/crouton-bookings/teams/[id]/customer-bookings` | GET | Get user's bookings with email stats |
| `/api/crouton-bookings/teams/[id]/customer-bookings-batch` | POST | Submit cart (batch checkout) |
| `/api/crouton-bookings/teams/[id]/customer-locations` | GET | Get accessible locations |
| `/api/crouton-bookings/teams/[id]/bookings/[bookingId]/resend-email` | POST | Resend email (if enabled) |

### Booking Modes

1. **Slot Mode** (default): Fixed time slots like `["09:00", "10:00", "11:00"]`
2. **Inventory Mode**: Quantity-based like `{ quantity: 20 }`

## Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-auth',
    '@friendlyinternet/crouton-bookings',
    './layers/bookings' // Generated collections
  ],

  // Optional: Enable email module
  runtimeConfig: {
    croutonBookings: {
      email: { enabled: true }
    },
    public: {
      croutonBookings: {
        email: { enabled: true }
      }
    }
  }
})
```

## Common Tasks

### Add a New Composable

1. Create file in `app/composables/useNewFeature.ts`
2. Export composable function
3. Will auto-import via Nuxt layer

### Add a New Component

1. Create in `app/components/[Category]/MyComponent.vue`
2. Component auto-registers as `CroutonBooking[Category]MyComponent`
3. Use Composition API with `<script setup lang="ts">`

### Add a New API Endpoint

1. Create in `server/api/crouton-bookings/teams/[id]/endpoint.get.ts`
2. Use `defineEventHandler`
3. Import utilities from consuming app context (layer pattern)

### Modify Availability Logic

1. Edit `app/composables/useBookingAvailability.ts`
2. Functions: `getSlotAvailability()`, `getInventoryAvailability()`
3. Handles both slot and inventory modes

### Customize Email Behavior

1. Edit `server/utils/booking-emails.ts` for utilities
2. Apps override `resend-email.post.ts` for custom logic
3. Email module is opt-in via `croutonBookings.email.enabled`

## Dependencies

- **Required**: `@friendlyinternet/nuxt-crouton`, `@friendlyinternet/nuxt-crouton-auth`
- **Optional**: `@friendlyinternet/crouton-email` (for email features)
- **Peer**: `@nuxtjs/i18n` (auto-included)

## Table Naming Convention

Package expects tables prefixed with `bookings`:

| Schema | Table Name |
|--------|------------|
| booking.json | `bookingsBookings` |
| location.json | `bookingsLocations` |
| settings.json | `bookingsSettings` |
| email-template.json | `bookingsEmailtemplates` |
| email-log.json | `bookingsEmaillogs` |

## i18n Keys

Translations in `i18n/locales/{en,nl}.json`:

```
bookings.
├── sidebar.*        - Sidebar UI
├── cart.*           - Cart UI
├── form.*           - Form labels
├── status.*         - Booking statuses
├── confirm.*        - Confirmation dialogs
├── buttons.*        - Action buttons
├── meta.*           - Metadata labels
└── common.*         - Common terms
```

## Testing

Test app at `apps/test-bookings/`:

```bash
cd apps/test-bookings
pnpm crouton generate  # Generate collections
npx nuxt db:generate   # Generate migrations
npx nuxt db:migrate    # Apply migrations
pnpm dev               # Start dev server
```

## Naming Conventions

```
Component: CroutonBooking[Category][Name]
Composable: useBooking[Feature], use[Domain]Settings
API: /api/crouton-bookings/teams/[id]/[resource]
Type: [Domain][Entity] (e.g., BookingWithRelations)
Table: bookings[Collection] (e.g., bookingsBookings)
```
