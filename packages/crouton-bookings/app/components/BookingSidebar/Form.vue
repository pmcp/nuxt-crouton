<script setup lang="ts">
import type { RadioGroupItem } from '@nuxt/ui'
import type { DateValue } from '@internationalized/date'
import { fromDate, toCalendarDate, getLocalTimeZone } from '@internationalized/date'

const { t } = useI18n()

interface Props {
  hideLocationSelect?: boolean
}

withDefaults(defineProps<Props>(), {
  hideLocationSelect: false,
})

const {
  formState,
  locations,
  locationsStatus,
  selectedLocation,
  allSlots,
  availableSlots,
  isSlotDisabled,
  availabilityLoading,
  canAddToCart,
  addToCart,
  hasBookingsOnDate,
  isDateFullyBooked,
  getBookedSlotsForDate,
  enableGroups,
  groupOptions,
  // Inventory mode
  isInventoryMode,
  getInventoryAvailability,
  // Cart functionality
  cart,
  cartCount,
  isSubmitting,
  removeFromCart,
  clearCart,
  submitAll,
} = useBookingCart()

// Get inventory availability for selected date
const inventoryInfo = computed(() => {
  if (!isInventoryMode.value || !formState.date) return null
  return getInventoryAvailability(formState.date)
})

// Auto-select first location when locations are loaded
watch(
  () => locations.value,
  (locs) => {
    if (locs && locs.length > 0 && !formState.locationId) {
      formState.locationId = locs[0].id
    }
  },
  { immediate: true },
)

// Fallback colors for slots without a color set (assigned by index)
const FALLBACK_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#14b8a6', '#a855f7', '#ef4444']
const DEFAULT_SLOT_COLOR = '#9ca3af'

// Get fallback color by slot index
function getFallbackColor(slotId: string): string {
  // Find index in allSlots (skip 'all-day' at index 0)
  const index = allSlots.value.findIndex(s => s.id === slotId)
  if (index <= 0) return DEFAULT_SLOT_COLOR
  const color = FALLBACK_COLORS[(index - 1) % FALLBACK_COLORS.length]
  return color ?? DEFAULT_SLOT_COLOR
}

// Get the color for a slot (from slot data or fallback)
function getSlotColorById(slotId: string): string {
  const slot = allSlots.value.find(s => s.id === slotId)
  // Use slot color if set, otherwise use fallback based on index
  return slot?.color || getFallbackColor(slotId)
}

// Get booked slots with their colors for a date
function getBookedSlotsWithColors(date: Date): Array<{ id: string, label: string, color: string }> {
  const bookedIds = getBookedSlotsForDate(date)
  // Filter out 'all-day' - if all-day is booked, date is fully booked anyway
  return bookedIds
    .filter(id => id !== 'all-day')
    .map((id) => {
      const slot = allSlots.value.find(s => s.id === id)
      return {
        id,
        label: slot?.label || id,
        color: slot?.color || getFallbackColor(id),
      }
    })
}

// Extended location option interface for enhanced dropdown
interface LocationOption {
  label: string
  value: string
  address: string
}

// Transform locations to select items with address
const locationOptions = computed<LocationOption[]>(() => {
  if (!locations.value) return []

  return locations.value.map(loc => ({
    label: loc.title,
    value: loc.id,
    address: [loc.street, loc.city, loc.zip].filter(Boolean).join(', '),
  }))
})

// Transform slots to RadioGroup items with disabled state
const slotItems = computed<RadioGroupItem[]>(() => {
  return allSlots.value.map(slot => ({
    label: slot.label || slot.value || slot.id,
    value: slot.id,
    disabled: isSlotDisabled(slot.id),
  }))
})

// Internal calendar value (DateValue format for UCalendar)
const calendarValue = computed({
  get: () => {
    if (!formState.date) return undefined
    const zonedDateTime = fromDate(formState.date, getLocalTimeZone())
    return toCalendarDate(zonedDateTime)
  },
  set: (value: DateValue | undefined) => {
    if (!value) {
      formState.date = null
    }
    else {
      formState.date = value.toDate(getLocalTimeZone())
    }
    // Reset slot when date changes
    formState.slotId = null
  },
})

// Convert DateValue to Date for helper functions
function dateValueToDate(dateValue: DateValue): Date {
  return dateValue.toDate(getLocalTimeZone())
}

// Check if date should be disabled (past or fully booked)
function isDateDisabled(dateValue: DateValue): boolean {
  const date = dateValueToDate(dateValue)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  // Disable past dates
  if (date < now) return true

  return isDateFullyBooked(date)
}

// Get booked slots for a DateValue (used in template)
function getBookedSlotsForDateValue(dateValue: DateValue) {
  const date = dateValueToDate(dateValue)
  // Don't show indicators if fully booked (date will be disabled)
  if (isDateFullyBooked(date)) return []
  return getBookedSlotsWithColors(date)
}

// Cache location title to prevent flicker during location switch
const cachedLocationTitle = ref('Select location')
watch(
  () => selectedLocation.value?.title,
  (newTitle) => {
    if (newTitle) {
      cachedLocationTitle.value = newTitle
    }
  },
  { immediate: true },
)

// Slots formatted for calendar indicator (excludes 'all-day')
const calendarSlots = computed(() => {
  return allSlots.value
    .filter(s => s.id !== 'all-day')
    .map(s => ({
      id: s.id,
      label: s.label || s.value || s.id,
      color: s.color || getFallbackColor(s.id),
    }))
})

// Preview card data for current selection
const previewData = computed(() => {
  const slots = allSlots.value
  const slot = slots.find(s => s.id === formState.slotId)
  const group = groupOptions.value.find(g => g.id === formState.groupId)
  const slotIndex = slots.findIndex(s => s.id === formState.slotId)

  const d = formState.date

  // Inventory mode preview
  if (isInventoryMode.value) {
    return {
      hasDate: !!d,
      day: d?.getDate() ?? '--',
      month: d?.toLocaleDateString('en-US', { month: 'short' }) ?? '---',
      weekday: d?.toLocaleDateString('en-US', { weekday: 'short' }) ?? '---',
      locationTitle: cachedLocationTitle.value,
      slotLabel: t('bookings.inventory.booking') || 'Inventory Booking',
      slotColor: undefined,
      groupLabel: group?.label || null,
      hasSlot: false,
      isInventoryMode: true,
      inventoryAvailable: inventoryInfo.value?.available ?? false,
      totalSlots: 0,
      slotPosition: -1,
    }
  }

  // Slot mode preview
  return {
    hasDate: !!d,
    day: d?.getDate() ?? '--',
    month: d?.toLocaleDateString('en-US', { month: 'short' }) ?? '---',
    weekday: d?.toLocaleDateString('en-US', { weekday: 'short' }) ?? '---',
    locationTitle: cachedLocationTitle.value,
    slotLabel: slot?.label || slot?.value || t('bookings.slots.selectSlot'),
    slotColor: slot?.color || (slot ? getSlotColorById(slot.id) : DEFAULT_SLOT_COLOR),
    groupLabel: group?.label || null,
    hasSlot: !!formState.slotId,
    isInventoryMode: false,
    inventoryAvailable: false,
    totalSlots: slots.length,
    slotPosition: slotIndex,
  }
})

// Handle submit
async function handleSubmit() {
  await submitAll()
}
</script>

<template>
  <div class=" w-full space-y-4">
    <!-- Location Selection - hidden in XL mode -->
    <div v-if="!hideLocationSelect">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {{ t('bookings.form.location') }}
      </label>

      <!-- Loading state -->
      <div v-if="locationsStatus === 'pending'" class="grid grid-cols-2 gap-2">
        <div v-for="i in 2" :key="i" class="h-10 bg-elevated rounded-lg animate-pulse" />
      </div>

      <!-- Location cards -->
      <URadioGroup
        v-else
        v-model="formState.locationId"
        :items="locationOptions"
        variant="card"
        indicator="hidden"
        value-key="value"
        :ui="{
          fieldset: 'grid grid-cols-2 gap-2',
          item: 'p-2 cursor-pointer',
        }"
      >
        <template #label="{ item }">
          <div class="flex items-center gap-1.5">
            <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5 text-primary shrink-0" />
            <span class="font-medium text-sm truncate">{{ item.label }}</span>
          </div>
        </template>
      </URadioGroup>
    </div>

    <!-- Calendar with availability indicators -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {{ t('bookings.form.date') }}
      </label>

      <!-- Calendar -->
      <div class="flex flex-col relative">
        <!-- Overlay when no location selected -->
        <div
          v-if="!formState.locationId"
          class="absolute inset-0 bg-default/60 z-10 rounded-lg flex items-center justify-center"
        >
          <span class="text-xs text-muted">Select a location first</span>
        </div>
        <UCalendar
          v-model="calendarValue"
          :is-date-disabled="(date) => !formState.locationId || isDateDisabled(date)"
          class="w-full transition-opacity duration-200"
          :class="{ 'opacity-50 pointer-events-none': !formState.locationId || availabilityLoading }"
          :ui="{ root: 'w-full', header: 'justify-between', gridRow: 'grid grid-cols-7 mb-1' }"
        >
          <template #day="{ day }">
            <div class="flex flex-col items-center">
              <span>{{ day.day }}</span>
              <div
                v-if="formState.locationId && calendarSlots.length > 0 && getBookedSlotsForDateValue(day).length > 0"
                class="flex gap-0.5 mt-0.5"
              >
                <div
                  v-for="slot in getBookedSlotsForDateValue(day)"
                  :key="slot.id"
                  class="w-1.5 h-1.5 rounded-full"
                  :style="{ backgroundColor: slot.color }"
                />
              </div>
            </div>
          </template>
        </UCalendar>
      </div>
    </div>

    <!-- Time Slots / Inventory - only show when date selected -->
    <div
      v-if="formState.date && formState.locationId"
      class="transition-opacity duration-200"
      :class="{ 'opacity-50 pointer-events-none': availabilityLoading }"
    >
      <!-- Inventory Mode - show availability instead of slots -->
      <template v-if="isInventoryMode">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ t('bookings.form.availability') || 'Availability' }}
        </label>

        <div v-if="inventoryInfo" class="bg-elevated rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon
                :name="inventoryInfo.available ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
                :class="inventoryInfo.available ? 'text-success' : 'text-error'"
                class="w-5 h-5"
              />
              <span class="font-medium">
                {{ inventoryInfo.available ? t('bookings.inventory.available') || 'Available' : t('bookings.inventory.fullyBooked') || 'Fully Booked' }}
              </span>
            </div>
            <UBadge
              :color="inventoryInfo.available ? 'success' : 'error'"
              variant="subtle"
            >
              {{ inventoryInfo.remaining }} / {{ inventoryInfo.total }}
            </UBadge>
          </div>
          <p class="text-xs text-muted mt-2">
            {{ t('bookings.inventory.remainingUnits', { remaining: inventoryInfo.remaining, total: inventoryInfo.total }) || `${inventoryInfo.remaining} of ${inventoryInfo.total} units available` }}
          </p>
        </div>
      </template>

      <!-- Slot Mode - show time slot selection -->
      <template v-else>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ t('bookings.form.timeSlot') }}
        </label>

        <!-- No slots configured -->
        <div v-if="slotItems.length === 0 && !availabilityLoading" class="text-center py-4">
          <UIcon name="i-lucide-clock" class="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p class="text-sm text-gray-500">
            {{ t('bookings.form.noTimeSlotsConfigured') }}
          </p>
        </div>

        <!-- Slots RadioGroup with colored indicators -->
        <URadioGroup
          v-else-if="slotItems.length > 0"
          v-model="formState.slotId"
          :items="slotItems"
          variant="card"
          indicator="hidden"
          orientation="vertical"
          :ui="{
            fieldset: 'grid grid-cols-1 gap-1.5',
            item: 'w-full justify-center py-1.5',
            wrapper: 'text-center',
          }"
        >
          <template #label="{ item }">
            <span
              class="inline-flex items-center justify-center gap-1.5 w-full"
              :class="item.disabled ? 'opacity-50' : ''"
            >
              <span
                v-if="item.value && item.value !== 'all-day'"
                class="w-2 h-2 rounded-full shrink-0"
                :style="{ backgroundColor: item.disabled ? '#6b7280' : getSlotColorById(String(item.value)) }"
              />
              <span :class="item.disabled ? 'line-through text-muted' : ''">{{ item.label }}</span>
              <UBadge v-if="item.disabled" size="xs" color="neutral" variant="subtle" class="ml-1">
                {{ t('bookings.status.booked') }}
              </UBadge>
            </span>
          </template>
        </URadioGroup>
      </template>

      <!-- Group Selection - only show when groups are enabled and (slot selected OR inventory mode) -->
      <div v-if="enableGroups && (formState.slotId || isInventoryMode)" class="mt-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ t('bookings.form.group') }}
        </label>
        <URadioGroup
          :model-value="formState.groupId ?? undefined"
          :items="groupOptions.map(g => ({ label: g.label, value: g.id }))"
          @update:model-value="formState.groupId = $event ?? null"
          variant="card"
          indicator="hidden"
          orientation="vertical"
          :ui="{
            fieldset: 'grid grid-cols-1 gap-1.5',
            item: 'w-full justify-center py-1.5',
            wrapper: 'text-center',
          }"
        />
      </div>

      <!-- Preview card - always visible, shows current selection -->
      <div
        class="mt-4 rounded-lg overflow-hidden transition-all duration-200"
        :class="canAddToCart ? 'bg-accented' : 'bg-elevated/50'"
      >
        <div class="p-3 flex items-center gap-3">
          <!-- Date card -->
          <CroutonBookingDateBadge
            v-if="formState.date"
            :date="formState.date"
            :variant="canAddToCart ? 'primary' : 'muted'"
          />

          <!-- Content -->
          <div class="flex-1 flex flex-col gap-1">
            <p class="text-sm font-medium truncate flex items-center gap-1.5">
              <span class="truncate capitalize">{{ previewData.locationTitle }}</span>
            </p>
            <div class="flex items-center">
              <!-- Inventory mode indicator -->
              <div
                v-if="previewData.isInventoryMode"
                class="flex items-center gap-1.5"
              >
                <UIcon
                  name="i-lucide-box"
                  class="w-3 h-3"
                  :class="previewData.inventoryAvailable ? 'text-success' : 'text-muted'"
                />
                <span class="text-xs">{{ previewData.slotLabel }}</span>
              </div>
              <!-- Slot indicator when slot selected -->
              <div
                v-else-if="previewData.hasSlot"
                class="flex items-center gap-1.5"
              >
                <span
                  class="w-2 h-2 rounded-full"
                  :style="{ backgroundColor: previewData.slotColor }"
                />
                <span class="text-xs">{{ previewData.slotLabel }}</span>
              </div>
              <!-- Placeholder when no slot selected -->
              <span v-else class="text-xs text-muted">{{ previewData.slotLabel }}</span>
            </div>
            <div v-if="previewData.groupLabel" class="relative" style="left:-0.07em;margin-top: 0.15em">
              <UBadge color="neutral" variant="subtle" size="md">
                {{ previewData.groupLabel }}
              </UBadge>
            </div>
          </div>

          <!-- Add button -->
          <UButton
            :color="canAddToCart ? 'primary' : 'neutral'"
            :variant="canAddToCart ? 'solid' : 'soft'"
            size="sm"
            :disabled="!canAddToCart"
            @click="addToCart"
          >
            {{ t('bookings.buttons.add') }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- Cart Section (always visible at bottom) -->
    <USeparator class="my-4" />

    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">{{ t('bookings.cart.yourSelections') }}</span>
        <div class="flex items-center gap-2">
          <UBadge v-if="cartCount > 0" color="primary" variant="subtle">
            {{ cartCount }}
          </UBadge>
          <UButton
            v-if="cartCount > 0"
            variant="ghost"
            color="neutral"
            size="xs"
            icon="i-lucide-trash-2"
            @click="clearCart"
          />
        </div>
      </div>

      <!-- Empty state -->
      <UAlert
        v-if="cartCount === 0"
        color="neutral"
        variant="subtle"
        icon="i-lucide-info"
        :title="t('bookings.cart.emptyTitle')"
        :description="t('bookings.cart.emptyDescription')"
      />

      <!-- Cart items -->
      <div v-else class="space-y-2">
        <CroutonBookingBookingSidebarBookingItem
          v-for="item in cart"
          :key="item.id"
          :id="item.id"
          :location-title="item.locationTitle"
          :slot-label="item.slotLabel"
          :slot-color="item.slotColor"
          :total-slots="item.totalSlots || 0"
          :slot-position="item.slotPosition ?? -1"
          :date="item.date"
          :group-label="item.groupLabel"
          :is-inventory-mode="item.isInventoryMode"
          action-type="remove"
          @remove="removeFromCart(item.id)"
        />

        <!-- Submit button -->
        <UButton
          block
          color="primary"
          icon="i-lucide-check"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="handleSubmit"
        >
          {{ isSubmitting ? t('bookings.cart.booking') : t('bookings.cart.bookSlots', { count: cartCount }) }}
        </UButton>
      </div>
    </div>
  </div>
</template>
