<script setup lang="ts">
/**
 * CroutonBookingsLayoutCalendarOnly — JUST the calendar as an atomic layout
 * block (#924), distinct from `bookings-calendar` (which wraps the whole Panel).
 * Self-fetches via `useBookingsList` and binds the shared layout filter store, so
 * the `bookings-filters` block drives which locations/statuses the calendar
 * reflects (Calendar filters its own indicators from the `filters` prop).
 *
 * Gap-report note (#924): the calendar↔list cross-highlight + click-to-create-on-
 * a-date flow is Panel-owned orchestration; across panes it's inert here.
 */
const props = withDefaults(defineProps<{
  scope?: 'personal' | 'team'
  /** Initial calendar view. */
  view?: 'week' | 'month'
}>(), { scope: 'team', view: 'month' })

const { calendarBookings, locations, settings } = useBookingsList({ scope: props.scope })
const { filters } = useBookingsLayoutFilters()

const view = ref<'week' | 'month'>(props.view)
</script>

<template>
  <div class="@container h-full overflow-auto p-2 @md:p-3">
    <CroutonBookingsCalendar
      v-model:filters="filters"
      :bookings="calendarBookings ?? []"
      :locations="locations ?? []"
      :settings="settings ?? null"
      :view="view"
    />
  </div>
</template>
