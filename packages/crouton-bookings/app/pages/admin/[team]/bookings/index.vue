<script setup lang="ts">
const route = useRoute()

// Get team ID from route
const teamId = computed(() => route.params.team as string)

// Preview mode state - provided to all child components via inject
const isPreview = ref(false)
provide('bookings-preview-mode', isPreview)

// Admin data: all team bookings with email details
const { data: adminBookings, pending: adminBookingsPending, refresh: refreshAdminBookings } = await useFetch(
  () => teamId.value ? `/api/crouton-bookings/teams/${teamId.value}/admin-bookings` : null,
  {
    default: () => [],
    watch: [teamId],
  }
)

// Member data: only current user's bookings (lazy - only fetched when preview is active)
const { data: memberBookings, pending: memberBookingsPending, refresh: refreshMemberBookings } = await useFetch(
  () => (isPreview.value && teamId.value) ? `/api/crouton-bookings/teams/${teamId.value}/customer-bookings` : null,
  {
    default: () => [],
    watch: [teamId, isPreview],
  }
)

const { items: locations, pending: locationsPending } = await useCollectionQuery('bookingsLocations')
const { items: settings, pending: settingsPending } = await useCollectionQuery('bookingsSettings')

// Resolved bookings based on preview mode
const bookings = computed(() => isPreview.value ? memberBookings.value : adminBookings.value)
const bookingsPending = computed(() => isPreview.value ? memberBookingsPending.value : adminBookingsPending.value)

const loading = computed(() => bookingsPending.value || locationsPending.value || settingsPending.value)
const firstSettings = computed(() => settings.value?.[0] ?? null)

// Refresh bookings when a new booking is created, updated, or email sent
async function handleBookingChange() {
  if (isPreview.value) {
    await refreshMemberBookings()
  }
  else {
    await refreshAdminBookings()
  }
}
</script>

<template>
  <div class="h-full p-4 flex flex-col gap-3">
    <!-- Preview mode banner + toggle -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="isPreview"
        class="flex items-center justify-between gap-3 px-4 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning"
      >
        <div class="flex items-center gap-2 text-sm font-medium">
          <UIcon name="i-lucide-eye" class="size-4" />
          <span>Previewing <strong>Bookings</strong> as member</span>
        </div>
        <UButton size="xs" color="warning" variant="soft" icon="i-lucide-x" @click="isPreview = false">
          Exit preview
        </UButton>
      </div>
    </Transition>

    <div class="flex items-center justify-end">
      <UButton
        v-if="!isPreview"
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-eye"
        @click="isPreview = true"
      >
        Preview as member
      </UButton>
    </div>

    <div class="flex-1 min-h-0">
      <CroutonBookingsPanel
        :bookings="bookings"
        :locations="locations"
        :settings="firstSettings"
        :loading="loading"
        title=""
        :empty-message="isPreview ? 'This member has no bookings' : 'No bookings yet for this team'"
        @created="handleBookingChange"
        @updated="handleBookingChange"
      />
    </div>
  </div>
</template>
