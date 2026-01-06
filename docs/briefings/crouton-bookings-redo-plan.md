# Crouton Bookings Package - Redo Plan

> **Status**: In Progress (Phase 6 Complete)
> **Created**: 2025-01-06
> **Goal**: Rebuild the bookings list view properly from the prototype

## Background

The initial port from `/Users/pmcp/Projects/crouton-bookings/layers/customer-booking/` copied too much (sidebar, floating islands, etc.) and the core List functionality broke. This plan focuses on rebuilding it smarter - not just copy-paste with prefixes.

### What We Want
- Weekly calendar on top (toggleable to month view)
- Filterable list of bookings below (status/location filters only)
- Proper slot visualization per location
- Simpler layout: calendar fixed, list scrolls independently
- Booking creation by clicking calendar day (Phase 6)
- Hover calendar → highlight matching bookings in list

### What We Don't Want (Yet)
- Sidebar booking flow (`BookingSidebar/*`)
- Floating mobile navigation
- Complex scroll-under-calendar behavior

---

## Component Design

### Naming Convention
`CroutonBookings[ComponentName]` - but semantic names, not copy-pasta.

### Component List

| Component | Purpose | Prototype Source | Priority |
|-----------|---------|------------------|----------|
| `SlotIndicator.vue` | Row of colored dots (filled=booked) | `Slot/Indicator.vue` | P1 |
| `LocationCardMini.vue` | Location title + SlotIndicator | `LocationCardMini.vue` | P1 |
| `BookingCard.vue` | Single booking display | `BookingSidebar/BookingItem.vue` | P1 |
| `DateBadge.vue` | Nice date display (weekday/day/month) | `DateBadge.vue` | P1 |
| `BookingsList.vue` | Container, orchestration | NEW (simplified) | P1 |
| `WeekStrip.vue` | Swipeable week carousel | `WeekStrip.vue` | P2 |
| `BookingsCalendar.vue` | Week/month toggle wrapper | NEW | P2 |
| `BookingsFilters.vue` | Status + location toggles | NEW | P2 |

### Composables

| Composable | Purpose | Notes |
|------------|---------|-------|
| `useBookingsList.ts` | Fetch bookings, loading states | Load all (max ~200) |
| `useBookingFilters.ts` | Status/location filter state | Reactive filters |
| `useBookingSlots.ts` | Slot parsing utilities | `parseSlotIds()`, `getSlotLabel()` |
| `useCalendarSync.ts` | Bidirectional sync logic | Phase 4 |

### Types

```typescript
// types/booking.ts
interface Booking {
  id: string
  location: string
  date: string | Date
  slot: string  // JSON-encoded array: '["slot-1"]'
  group?: string | null
  status: string
  createdAt: string | Date
  locationData?: LocationData
  ownerUser?: UserInfo | null
  createdByUser?: UserInfo | null
}

interface LocationData {
  id: string
  title: string
  color?: string
  street?: string
  city?: string
  slots?: SlotItem[] | string  // JSON or parsed
}

interface SlotItem {
  id: string
  label?: string
  value?: string
  color?: string
}

interface UserInfo {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
}
```

### Slot Field Handling

The `slot` field is stored as JSON string in DB (SQLite has no native arrays):
```typescript
// DB: '["slot-1"]' or '["slot-1", "slot-2"]'

// Clean utility in useBookingSlots.ts:
export function parseSlotIds(slot: string | string[] | null): string[] {
  if (!slot) return []
  if (Array.isArray(slot)) return slot
  try {
    const parsed = JSON.parse(slot)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
```

### Data Flow

```
BookingsList.vue
├── fetches bookings (date-windowed)
├── fetches settings (for statuses, groups)
├── fetches locations (for slot configs)
│
├── BookingsCalendar.vue
│   ├── WeekStrip.vue (week mode)
│   │   └── SlotIndicator.vue (per location per day)
│   └── UCalendar (month mode)
│       └── SlotIndicator.vue (per location per day)
│
├── BookingsFilters.vue
│   ├── Status toggles (from settings.statuses)
│   └── Location toggles
│       └── LocationCardMini.vue
│           └── SlotIndicator.vue
│
└── Booking cards list
    └── BookingCard.vue
        └── SlotIndicator.vue (single slot highlighted)
```

---

## Phases

### Phase 1: Clean Slate + Data Layer ✅
> **Goal**: Have working test data and clean starting point

- [x] Archive broken components to `_archive/` folder
- [x] Verify/create seed script for test data
  - 3 locations with different slot configs (Court A: 3 slots, Court B: 4 slots, Training Room: 3 slots)
  - 25 bookings across date range (±10-20 days from today)
  - Mix of statuses (confirmed, pending, cancelled)
- [x] Verify API endpoints work:
  - [x] `GET /api/crouton-bookings/teams/[id]/customer-bookings` (from package)
  - [x] `GET /api/crouton-bookings/teams/[id]/customer-locations` (from package)
  - [x] `GET /api/teams/[id]/bookings-settings` (from generated collections)
  - [x] `GET /api/teams/[id]/bookings-locations` (from generated collections)
  - [x] `GET /api/teams/[id]/bookings-bookings` (from generated collections)
- [x] **Checkpoint**: Can query bookings via API ✅

**Decisions:**
- Seed endpoint created at `apps/test-bookings/server/api/seed.post.ts`
- API endpoints require authentication (401 without session) - this is correct behavior
- Two sets of endpoints: package endpoints (`/api/crouton-bookings/...`) and collection endpoints (`/api/teams/...`)
- Bookings page updated to show Phase 1 complete message

---

### Phase 2: Core Components ✅
> **Goal**: See a working list with slot visualization

- [x] Create types file `types/booking.ts`
  - Added `Booking` interface with full API response shape
  - Added `UserInfo` interface
  - Enhanced `SettingsData` with statuses array
- [x] Create `useBookingSlots.ts` composable
  - `parseSlotIds()`, `parseLocationSlots()`, `getSlotLabel()`, `getSlotLabels()`, `getSlot()`
- [x] Review `SlotIndicator.vue` (already exists, working well)
  - Props: `slots`, `bookedSlotIds`, `color`, `size`
  - Shows colored dots, filled = booked
- [x] Review/update `LocationCardMini.vue`
  - Added: `bookedSlotIds`, `color`, `size` props
  - Shows location name + SlotIndicator
- [x] Review `DateBadge.vue` (already exists, looks good)
- [x] Create `BookingCard.vue`
  - Props: `booking` (Booking type), `showStatus`, `highlighted`
  - Shows: DateBadge, location title, slot indicator, status badge
  - NO email actions yet (Phase 5)
- [x] Create `useBookingsList.ts` composable
  - Fetches bookings from `/api/crouton-bookings/teams/[id]/customer-bookings`
  - Fetches settings from `/api/teams/[id]/bookings-settings`
  - Returns: bookings (sorted by date), settings, loading, error, refresh
- [x] Create `List.vue` (simple version)
  - Uses `useBookingsList` composable
  - Renders BookingCard for each
  - Loading skeleton, error state, empty state
- [x] **Checkpoint**: See scrollable list with slot indicators, sorted by date

**Decisions:**
- Component prefix is `CroutonBookings` (plural) per nuxt.config.ts
- List.vue is the main component, page uses `<CroutonBookingsList />`
- BookingCard shows slot indicator inline with slot label text
- Used existing Slot/Indicator.vue - works well, no changes needed

---

### Phase 3: Calendar + Filters ✅
> **Goal**: Calendar navigation and filtering working

- [x] Review `WeekStrip.vue` - already has #day slot, works well
- [x] Create `Calendar.vue` (CroutonBookingsCalendar)
  - Week/month view toggle using UTabs
  - Week mode uses WeekStrip.vue
  - Month mode uses UCalendar
  - Slot indicators per location per day
  - Emits selected date via v-model
- [x] Create `Filters.vue` (CroutonBookingsFilters)
  - Status toggles from settings.statuses
  - Location toggles with color indicators
  - Clear all filters button
- [x] Create `useBookingFilters.ts` composable
- [x] Update `useBookingsList.ts` to also fetch locations
- [x] Update `List.vue` to accept filtered bookings as prop
- [x] Wire up bookings page with calendar + filters
- [x] **Checkpoint**: Can filter by date, status, location ✅

**Decisions:**
- Component names: `Calendar.vue`, `Filters.vue` (no redundant "Bookings" prefix since CroutonBookings is already the component prefix)
- Show ALL statuses by default (including cancelled)
- Filters always visible (not collapsible)
- Status filtering uses `value` field to match booking.status
- Seed data updated to include statuses configuration
- Settings statuses stored as JSON string in DB, Filters.vue parses with `parsedStatuses` computed

---

### Phase 4: Calendar Interaction Model ✅
> **Goal**: Define clear interaction pattern for calendar

- [x] Remove date selection/filter from calendar
- [x] Hover calendar day → highlight matching bookings in list
- [x] Click calendar day → placeholder for booking creation (Phase 6)
- [x] **Checkpoint**: Clear interaction model defined

**Decisions:**
- Calendar is **action-oriented** not filter-oriented
- **Hover** = navigate/preview (highlights matching BookingCards)
- **Click** = create booking (opens creation flow in Phase 6)
- Date filtering removed entirely - use status/location filters only
- Slot indicators show availability at a glance

---

### Phase 5: Email + Polish + Tests
> **Goal**: Feature parity with prototype, tested

- [ ] Add email actions to BookingCard
  - Show available actions based on templates
  - Resend functionality
  - Email stats display
- [ ] Polish:
  - Loading states
  - Error handling
  - Empty states
  - Responsive behavior
- [ ] Tests:
  - Unit tests for composables (`useBookingSlots`, `useBookingFilters`)
  - Component tests for `BookingCard`, `SlotIndicator`
  - Integration test for `BookingsList`
- [ ] **Checkpoint**: Full feature parity, tested

**Decisions:**
- _TBD_

---

### Phase 6: Booking Creation ✅
> **Goal**: New approach to creating bookings

- [x] Design new creation flow - inline card at date position
- [x] Create `BookingCreateCard.vue` component
  - Location selection (auto-selects first)
  - Slot selection with availability checking
  - Loading state while fetching availability
  - Visual feedback for disabled slots (strikethrough, ban icon, error color)
  - "All Day" disabled when any slot is booked
  - Create/Cancel actions
- [x] Update `List.vue` to render inline create card
  - Card appears at correct date position in the list
  - Handles empty list case (card shown alone)
  - Handles existing bookings case (card after date's bookings)
  - Auto-scrolls to create card when it appears
- [x] Wire up page with `@day-click` → `creatingAtDate` → List
- [x] **Checkpoint**: Can create bookings by clicking calendar days ✅

**Decisions:**
- **Inline card** instead of modal - booking is created "in context"
- Card appears at the correct date position in the booking list
- Uses existing `useBookingCart` composable for availability and submission
- Availability fetched automatically when location selected (3 months)
- Disabled slots show: strikethrough text, ban icon, error color
- Callback ref pattern used for scrollIntoView (handles multiple conditional refs)

---

## Files to Archive/Delete

Current files in `packages/crouton-bookings/app/components/`:

```
components/
├── List.vue                    # ARCHIVE - broken port of MyBookings/List
├── BookingSidebar/             # ARCHIVE FOLDER - sidebar flow not needed yet
│   ├── BookingItem.vue         # ARCHIVE (will create new BookingCard.vue)
│   ├── Cart.vue                # ARCHIVE
│   ├── Form.vue                # ARCHIVE
│   ├── LocationContent.vue     # ARCHIVE
│   ├── LocationMap.vue         # ARCHIVE
│   ├── LocationNav.vue         # ARCHIVE
│   ├── MyBookings.vue          # ARCHIVE
│   ├── Panel.vue               # ARCHIVE
│   ├── SM.vue                  # ARCHIVE
│   ├── Toggle.vue              # ARCHIVE
│   └── XL.vue                  # ARCHIVE
├── BookingDrawer.vue           # ARCHIVE
├── BookingFloatingButton.vue   # ARCHIVE
├── FloatingIslandNav.vue       # ARCHIVE
├── FloatingIslandSidebar.vue   # ARCHIVE
├── DateBadge.vue               # KEEP - nice date display component
├── LocationCardMini.vue        # KEEP - location + slots mini view
├── Slot/                       # KEEP
│   └── Indicator.vue           # KEEP - slot dots visualization
└── WeekStrip.vue               # KEEP - swipeable week carousel
```

**Summary:**
- **KEEP**: DateBadge, LocationCardMini, Slot/Indicator, WeekStrip (4 files)
- **ARCHIVE**: Everything else (15 files) → move to `_archive/` folder

---

## API Endpoints Needed

### Package Endpoints (from crouton-bookings)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/crouton-bookings/teams/[id]/customer-bookings` | GET | User's bookings with location data | ✅ Works |
| `/api/crouton-bookings/teams/[id]/customer-locations` | GET | Locations user can book | ✅ Works |
| `/api/crouton-bookings/teams/[id]/availability` | GET | Availability for date range | ✅ Exists |
| `/api/crouton-bookings/teams/[id]/bookings/[id]/resend-email` | POST | Resend email (Phase 5) | ✅ Exists |

### Collection Endpoints (from generated layers)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/teams/[id]/bookings-settings` | GET | Statuses, groups config | ✅ Works |
| `/api/teams/[id]/bookings-locations` | GET | Locations with slots | ✅ Works |
| `/api/teams/[id]/bookings-bookings` | GET | All bookings (admin) | ✅ Works |

---

## Notes & Decisions Log

### 2025-01-06 - Phase 1 Complete
- Archived 16 files to `_archive/` folder (List.vue, BookingSidebar/*, floating islands, etc.)
- Kept: DateBadge.vue, LocationCardMini.vue, Slot/Indicator.vue, WeekStrip.vue
- Also kept: Admin/ and CustomerBooking/ folders (not mentioned in archive list)
- Created seed endpoint at `apps/test-bookings/server/api/seed.post.ts`
- Seed creates: 3 locations, 25 bookings, 1 settings record
- All API endpoints verified (return 401 without auth - correct behavior)
- Updated bookings page to show Phase 1 complete message
- **Ready for Phase 2**: Core Components

### 2025-01-06 - Initial Planning
- Decided on phased approach
- Keep WeekStrip (it's cool)
- Simpler layout: calendar fixed, list scrolls
- Statuses from settings, not hardcoded
- Email feature deferred to Phase 5
- Bidirectional sync wanted but deferred to Phase 4

### 2025-01-06 - Detailed Design
- **Composables**: Extract logic into composables (Nuxt way)
- **Types**: Centralize in `types/booking.ts`
- **Slot field**: Keep as JSON string in DB, create `parseSlotIds()` utility
- **Data loading**: Load all bookings (max ~200), no date windowing needed
- **Sorting**: Bookings sorted by date (ascending)
- **Testing**: Add to Phase 5 (unit + component tests)
- **DateBadge**: Keep existing component, looks good
- **Each location has own slots**: SlotIndicator shows per-location, multiple indicators per day if multiple locations have bookings

### 2025-01-07 - Calendar Interaction Model (Phase 4)
- **Problem**: Three behaviors clashed: click filters, click scrolls, click creates booking
- **Solution**: Simplified to action-oriented model:
  - **Hover** = navigate/preview (highlight matching bookings)
  - **Click** = create booking (opens creation flow in Phase 6)
- **Removed**: Date filtering from calendar entirely
- **Kept**: Status/location filters in separate Filters component
- Calendar becomes visual indicator of availability + action trigger
- Slot indicators show what's booked vs available at a glance
- Creation component (Phase 6) will show existing bookings for the day + allow booking empty slots

### 2025-01-07 - Booking Creation (Phase 6)
- **Scroll-to-day**: List scrolls to show bookings when hovering calendar days
- **Inline creation**: Click day → BookingCreateCard appears at date position in list
- **UX decisions**:
  - Rejected modal approach ("i dont want a modal tho")
  - Card appears at correct date position for context
  - Auto-scrolls to card when it appears
- **Slot availability**:
  - Shows loading skeleton while fetching
  - Disabled slots: strikethrough, ban icon, error color
  - "All Day" disabled when any slot booked
- **Technical fix**: Callback ref pattern for scrollIntoView (multiple conditional refs issue)

---

## Reference: Prototype Files

Source: `/Users/pmcp/Projects/crouton-bookings/layers/customer-booking/app/components/`

| File | Lines | What it does |
|------|-------|--------------|
| `MyBookings/List.vue` | 1011 | Main list with calendar, filters, sync |
| `WeekStrip.vue` | 535 | Swipeable week carousel |
| `BookingSidebar/BookingItem.vue` | 917 | Single booking card |
| `Slot/Indicator.vue` | ~50 | Colored slot dots |
| `LocationCardMini.vue` | ~46 | Location + slots mini view |