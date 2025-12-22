<script setup lang="ts">
import type { StepperItem } from '@nuxt/ui'
import type { LocationData } from '../../types/booking'

const {
  currentStep,
  bookingState,
  selectedLocation,
  isSubmitting,
  isSuccess,
  allowedLocations,
  locationsStatus,
  canProceed,
  teamId,
  selectLocation,
  selectDate,
  selectSlot,
  submitBooking,
  reset,
} = useCustomerBooking()

const router = useRouter()
const stepper = useTemplateRef('stepper')

// Stepper items
const items: StepperItem[] = [
  {
    slot: 'location' as const,
    title: 'Location',
    description: 'Choose where to book',
    icon: 'i-lucide-map-pin',
  },
  {
    slot: 'date' as const,
    title: 'Date',
    description: 'Pick a date',
    icon: 'i-lucide-calendar',
  },
  {
    slot: 'slot' as const,
    title: 'Time',
    description: 'Select a time slot',
    icon: 'i-lucide-clock',
  },
  {
    slot: 'confirm' as const,
    title: 'Confirm',
    description: 'Review and submit',
    icon: 'i-lucide-check',
  },
]

// Handle location selection
function handleLocationSelect(location: LocationData) {
  selectLocation(location)
}

// Handle date selection
function handleDateSelect(date: Date | null) {
  if (date) {
    selectDate(date)
  }
}

// Handle slot selection
function handleSlotSelect(slotId: string) {
  selectSlot(slotId)
}

// Handle booking submission
async function handleSubmit() {
  const result = await submitBooking()
  if (result) {
    // Success - stay on page to show success state
  }
}

// Navigate to my bookings
function goToMyBookings() {
  router.push(`/dashboard/${teamId.value}/bookings`)
}

// Start new booking
function startNewBooking() {
  reset()
}

// Responsive orientation
const { width } = useWindowSize()
const isMobile = computed(() => width.value < 768)
const stepperOrientation = computed(() => isMobile.value ? 'vertical' : 'horizontal')
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Success State -->
    <div v-if="isSuccess" class="text-center py-12">
      <div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <UIcon name="i-lucide-check" class="w-10 h-10 text-green-600" />
      </div>
      <h2 class="text-2xl font-bold text-gray-900 mb-2">
        Booking Confirmed!
      </h2>
      <p class="text-gray-500 mb-8">
        Your booking has been successfully submitted.
      </p>
      <div class="flex justify-center gap-4">
        <UButton variant="outline" @click="startNewBooking">
          Book Another
        </UButton>
        <UButton @click="goToMyBookings">
          View My Bookings
        </UButton>
      </div>
    </div>

    <!-- Wizard -->
    <div v-else>
      <UStepper
        ref="stepper"
        v-model="currentStep"
        :items="items"
        :orientation="stepperOrientation"
        disabled
        class="w-full"
      >
        <!-- Step 1: Location Selection -->
        <template #location>
          <div class="py-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">
              Select a Location
            </h2>

            <!-- Loading -->
            <div v-if="locationsStatus === 'pending'" class="text-center py-12">
              <UIcon name="i-lucide-loader-2" class="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
              <p class="text-gray-500">
                Loading locations...
              </p>
            </div>

            <!-- Empty state -->
            <div v-else-if="!allowedLocations || allowedLocations.length === 0" class="text-center py-12">
              <UIcon name="i-lucide-map-pin-off" class="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p class="text-gray-500">
                You don't have access to any locations.
              </p>
              <p class="text-sm text-gray-400 mt-1">
                Please contact an administrator to get access.
              </p>
            </div>

            <!-- Location cards -->
            <div v-else class="grid gap-4 sm:grid-cols-2">
              <CustomerBookingLocationCard
                v-for="location in allowedLocations"
                :key="location.id"
                :location="location"
                :selected="bookingState.locationId === location.id"
                @select="handleLocationSelect"
              />
            </div>
          </div>
        </template>

        <!-- Step 2: Date Selection -->
        <template #date>
          <div class="py-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">
              Select a Date
            </h2>

            <div class="flex justify-center">
              <CroutonCalendar
                :date="bookingState.date"
                @update:date="handleDateSelect"
              />
            </div>
          </div>
        </template>

        <!-- Step 3: Slot Selection -->
        <template #slot>
          <div class="py-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">
              Select a Time Slot
            </h2>

            <CustomerBookingSlotPicker
              :slots="selectedLocation?.slots"
              :selected-slot-id="bookingState.slot"
              @select="handleSlotSelect"
            />
          </div>
        </template>

        <!-- Step 4: Confirmation -->
        <template #confirm>
          <div class="py-6">
            <CustomerBookingConfirmation
              :location="selectedLocation"
              :date="bookingState.date"
              :slot-id="bookingState.slot"
              :is-submitting="isSubmitting"
              @submit="handleSubmit"
            />
          </div>
        </template>
      </UStepper>

      <!-- Navigation Buttons -->
      <div class="flex justify-between mt-8 pt-6 border-t">
        <UButton
          variant="outline"
          :disabled="currentStep === 0"
          @click="stepper?.prev()"
        >
          <UIcon name="i-lucide-arrow-left" class="w-4 h-4 mr-2" />
          Back
        </UButton>

        <UButton
          v-if="currentStep < 3"
          :disabled="!canProceed"
          @click="stepper?.next()"
        >
          Continue
          <UIcon name="i-lucide-arrow-right" class="w-4 h-4 ml-2" />
        </UButton>
      </div>
    </div>
  </div>
</template>
