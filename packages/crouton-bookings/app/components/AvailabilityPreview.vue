<script setup lang="ts">
import type { BlockedDateItem, SlotItem, SlotSchedule } from '../types/booking'

interface Props {
  openDays?: number[] | string | null
  slotSchedule?: SlotSchedule | string | null
  blockedDates?: BlockedDateItem[] | string | null
  slots?: SlotItem[] | string | null
}

const props = defineProps<Props>()

const locationRef = computed(() => ({
  openDays: props.openDays,
  slotSchedule: props.slotSchedule,
  blockedDates: props.blockedDates,
  slots: props.slots,
}))

const { isDateUnavailable, getBlockedReason } = useScheduleRules(locationRef)
</script>

<template>
  <div>
    <CroutonBookingsCalendar
      :is-date-unavailable="isDateUnavailable"
      :get-blocked-reason="getBlockedReason"
      :bookings="[]"
      :locations="[]"
      view="month"
    />
  </div>
</template>
