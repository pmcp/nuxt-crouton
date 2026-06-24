/**
 * crouton-bookings seed provider (#830).
 *
 * Generic demo data so any app/book that extends `@fyit/crouton-bookings` boots
 * with a populated booking platform instead of a blank calendar:
 *
 * - **Settings** — three statuses (confirmed/pending/cancelled) and three age
 *   groups (Adults/Juniors/Seniors), the option lists the booking form's
 *   `status`/`group` selects read.
 * - **Locations** — two slot-based courts (morning/afternoon/evening slots, open
 *   every day) and one inventory-mode equipment pool, exercising both booking
 *   modes the package supports.
 * - **Bookings** — a handful of sample bookings on upcoming days (dates relative
 *   to seed time via `unixepoch()`), so the calendar/list render content on the
 *   first boot.
 *
 * Provider id `bookings`, `dependsOn: ['auth']` (every row hangs off the team
 * `organization` the auth provider upserts).
 *
 * Pure module: references the generated table/column names as strings (matching
 * what `crouton config` emits from this package's `schemas/*.json`), so it never
 * imports an app's generated schema and loads cleanly under jiti. Deliberately
 * generic — NOT Velo's school/bike-library flavour (that stays in
 * `apps/velo/server/api/seed`).
 */
import type { SeedProvider, SeedContext } from '@fyit/crouton-core/shared/seed'
import { seedId, raw } from '@fyit/crouton-core/shared/seed'

/** Audit columns every generated collection row carries (owner is demo data). */
const SEED_OWNER = 'seed'

/** A demo time slot as stored in `bookings_locations.slots` (JSON array). */
interface DemoSlot {
  key: string
  label: string
  startTime: string
  endTime: string
  capacity: number
}

const SLOTS: DemoSlot[] = [
  { key: 'morning', label: 'Morning', startTime: '09:00', endTime: '12:00', capacity: 4 },
  { key: 'afternoon', label: 'Afternoon', startTime: '13:00', endTime: '17:00', capacity: 4 },
  { key: 'evening', label: 'Evening', startTime: '18:00', endTime: '21:00', capacity: 2 }
]

interface DemoLocation {
  slug: string
  title: string
  color: string
  city: string
  inventoryMode: boolean
  quantity: number
}

const LOCATIONS: DemoLocation[] = [
  { slug: 'court-a', title: 'Court A', color: '#3b82f6', city: 'Amsterdam', inventoryMode: false, quantity: 0 },
  { slug: 'court-b', title: 'Court B', color: '#10b981', city: 'Amsterdam', inventoryMode: false, quantity: 0 },
  { slug: 'equipment-pool', title: 'Equipment Pool', color: '#f59e0b', city: 'Amsterdam', inventoryMode: true, quantity: 10 }
]

interface DemoStatus { key: string, label: string, color: string }
const STATUSES: DemoStatus[] = [
  { key: 'confirmed', label: 'Confirmed', color: 'green' },
  { key: 'pending', label: 'Pending', color: 'yellow' },
  { key: 'cancelled', label: 'Cancelled', color: 'red' }
]

interface DemoGroup { key: string, label: string }
const GROUPS: DemoGroup[] = [
  { key: 'adults', label: 'Adults' },
  { key: 'juniors', label: 'Juniors' },
  { key: 'seniors', label: 'Seniors' }
]

/** A demo booking, referencing locations/slots/groups by their stable keys. */
interface DemoBooking {
  locationSlug: string
  slotKeys: string[]
  groupKey: string
  status: string
  /** Days from seed time — keeps demo bookings always "upcoming" on a fresh boot. */
  dayOffset: number
}

const BOOKINGS: DemoBooking[] = [
  { locationSlug: 'court-a', slotKeys: ['morning'], groupKey: 'juniors', status: 'confirmed', dayOffset: 1 },
  { locationSlug: 'court-a', slotKeys: ['afternoon'], groupKey: 'adults', status: 'confirmed', dayOffset: 2 },
  { locationSlug: 'court-b', slotKeys: ['evening'], groupKey: 'adults', status: 'pending', dayOffset: 2 },
  { locationSlug: 'court-b', slotKeys: ['morning', 'afternoon'], groupKey: 'seniors', status: 'confirmed', dayOffset: 4 },
  { locationSlug: 'equipment-pool', slotKeys: [], groupKey: 'adults', status: 'confirmed', dayOffset: 3 }
]

/** Stable slot id within a location, so bookings can reference it deterministically. */
function slotId(ctx: SeedContext, locationSlug: string, slotKey: string): string {
  return seedId('slot', ctx.teamSlug, locationSlug, slotKey)
}

function seedSettings(ctx: SeedContext) {
  ctx.upsert('bookings_settings', { id: seedId('bookings-settings', ctx.teamSlug) }, {
    teamId: ctx.teamId,
    owner: SEED_OWNER,
    order: 0,
    statuses: STATUSES.map(s => ({ id: seedId('status', ctx.teamSlug, s.key), label: s.label, color: s.color })),
    groups: GROUPS.map(g => ({ id: seedId('group', ctx.teamSlug, g.key), label: g.label })),
    createdAt: ctx.now,
    updatedAt: ctx.now,
    createdBy: SEED_OWNER,
    updatedBy: SEED_OWNER
  })
}

function seedLocations(ctx: SeedContext) {
  LOCATIONS.forEach((loc, index) => {
    ctx.upsert('bookings_locations', { id: seedId('location', ctx.teamSlug, loc.slug) }, {
      teamId: ctx.teamId,
      owner: SEED_OWNER,
      order: index,
      title: loc.title,
      color: loc.color,
      street: null,
      zip: null,
      city: loc.city,
      location: null,
      content: null,
      allowedMemberIds: null,
      // Inventory locations have no named slots.
      slots: loc.inventoryMode
        ? []
        : SLOTS.map(s => ({
            id: slotId(ctx, loc.slug, s.key),
            label: s.label,
            startTime: s.startTime,
            endTime: s.endTime,
            capacity: s.capacity
          })),
      // null openDays = open every day (per location.json help).
      openDays: null,
      slotSchedule: {},
      blockedDates: null,
      inventoryMode: loc.inventoryMode,
      quantity: loc.inventoryMode ? loc.quantity : 0,
      maxBookingsPerMonth: null,
      translations: null,
      createdAt: ctx.now,
      updatedAt: ctx.now,
      createdBy: SEED_OWNER,
      updatedBy: SEED_OWNER
    })
  })
}

function seedBookings(ctx: SeedContext) {
  BOOKINGS.forEach((booking, index) => {
    ctx.upsert('bookings_bookings', { id: seedId('booking', ctx.teamSlug, String(index)) }, {
      teamId: ctx.teamId,
      owner: SEED_OWNER,
      order: index,
      location: seedId('location', ctx.teamSlug, booking.locationSlug),
      // Upcoming relative to seed time, so a fresh calendar shows future bookings.
      date: raw(`unixepoch() + 86400 * ${booking.dayOffset}`),
      slot: booking.slotKeys.map(key => slotId(ctx, booking.locationSlug, key)),
      group: seedId('group', ctx.teamSlug, booking.groupKey),
      quantity: 1,
      status: booking.status,
      createdAt: ctx.now,
      updatedAt: ctx.now,
      createdBy: SEED_OWNER,
      updatedBy: SEED_OWNER
    })
  })
}

export const provider: SeedProvider = {
  id: 'bookings',
  dependsOn: ['auth'],
  seed(ctx) {
    seedSettings(ctx)
    seedLocations(ctx)
    seedBookings(ctx)
  }
}

export default provider
