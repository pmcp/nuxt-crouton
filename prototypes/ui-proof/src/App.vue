<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Force dark mode for the prototype (the <html class="dark"> + this keep it dark)
onMounted(() => {
  document.documentElement.classList.add('dark')
})

const search = ref('')
const isModalOpen = ref(false)

// Open the "new booking" modal on first paint if ?modal=1 is present
onMounted(() => {
  if (new URLSearchParams(window.location.search).get('modal') === '1') {
    isModalOpen.value = true
  }
})

const stats = [
  { label: 'Bookings today', value: '24', icon: 'i-lucide-calendar-check', delta: '+12%', color: 'success' as const },
  { label: 'Revenue', value: '€4,820', icon: 'i-lucide-banknote', delta: '+8%', color: 'success' as const },
  { label: 'Pending', value: '6', icon: 'i-lucide-clock', delta: '-3%', color: 'warning' as const },
  { label: 'Cancellations', value: '2', icon: 'i-lucide-x-circle', delta: '+1', color: 'error' as const }
]

type Status = 'confirmed' | 'pending' | 'cancelled'
const statusColor: Record<Status, 'success' | 'warning' | 'error'> = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'error'
}

interface Booking {
  id: number
  guest: string
  service: string
  date: string
  party: number
  status: Status
}

const bookings = ref<Booking[]>([
  { id: 1042, guest: 'Amélie Dubois', service: 'Tasting Menu', date: 'Jun 25, 19:30', party: 2, status: 'confirmed' },
  { id: 1043, guest: 'Marcus Webb', service: 'Wine Pairing', date: 'Jun 25, 20:00', party: 4, status: 'pending' },
  { id: 1044, guest: 'Sofia Romano', service: 'Chef’s Table', date: 'Jun 26, 18:00', party: 6, status: 'confirmed' },
  { id: 1045, guest: 'Liam O’Connor', service: 'Brunch', date: 'Jun 26, 11:30', party: 3, status: 'cancelled' },
  { id: 1046, guest: 'Yuki Tanaka', service: 'Tasting Menu', date: 'Jun 27, 19:00', party: 2, status: 'pending' }
])

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return bookings.value
  return bookings.value.filter(b =>
    b.guest.toLowerCase().includes(q) || b.service.toLowerCase().includes(q)
  )
})

const rowMenu = (b: Booking) => [
  [{ label: 'View details', icon: 'i-lucide-eye' }, { label: 'Edit', icon: 'i-lucide-pencil' }],
  [{ label: 'Confirm', icon: 'i-lucide-check', onSelect: () => (b.status = 'confirmed') }],
  [{ label: 'Cancel', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => (b.status = 'cancelled') }]
]

// New booking form state
const form = ref({ guest: '', service: 'Tasting Menu', party: 2, date: '' })
function createBooking() {
  bookings.value.unshift({
    id: 1047 + bookings.value.length,
    guest: form.value.guest || 'Walk-in',
    service: form.value.service,
    date: form.value.date || 'Jun 28, 19:30',
    party: form.value.party,
    status: 'pending'
  })
  form.value = { guest: '', service: 'Tasting Menu', party: 2, date: '' }
  isModalOpen.value = false
}
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-default text-default">
      <!-- Top bar -->
      <header class="border-b border-default bg-elevated/50 backdrop-blur sticky top-0 z-10">
        <div class="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="size-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <UIcon name="i-lucide-utensils" class="size-5 text-primary" />
            </div>
            <div>
              <h1 class="font-semibold leading-tight">Fanfare Bistro</h1>
              <p class="text-xs text-muted">Bookings dashboard</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UButton icon="i-lucide-bell" color="neutral" variant="ghost" />
            <UDropdownMenu
              :items="[
                [{ label: 'Profile', icon: 'i-lucide-user' }, { label: 'Settings', icon: 'i-lucide-settings' }],
                [{ label: 'Sign out', icon: 'i-lucide-log-out', color: 'error' }]
              ]"
            >
              <UButton color="neutral" variant="soft" trailing-icon="i-lucide-chevron-down">
                <UAvatar size="2xs" src="https://i.pravatar.cc/64?img=12" />
                Maarten
              </UButton>
            </UDropdownMenu>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <!-- Header row -->
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold tracking-tight">Today’s service</h2>
            <p class="text-muted">Thursday, June 25 · 2 seatings</p>
          </div>
          <UButton icon="i-lucide-plus" size="lg" @click="isModalOpen = true">New booking</UButton>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <UCard v-for="s in stats" :key="s.label" :ui="{ body: 'p-4' }">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm text-muted">{{ s.label }}</p>
                <p class="text-2xl font-bold mt-1">{{ s.value }}</p>
              </div>
              <div class="size-10 rounded-lg bg-elevated flex items-center justify-center">
                <UIcon :name="s.icon" class="size-5 text-primary" />
              </div>
            </div>
            <div class="mt-3">
              <UBadge :color="s.color" variant="subtle" size="sm">{{ s.delta }}</UBadge>
              <span class="text-xs text-muted ml-2">vs yesterday</span>
            </div>
          </UCard>
        </div>

        <!-- Bookings table -->
        <UCard :ui="{ body: 'p-0', header: 'flex items-center justify-between gap-4' }">
          <template #header>
            <h3 class="font-semibold">Reservations</h3>
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Search guest or service…"
              class="w-64"
            />
          </template>

          <table class="w-full text-sm">
            <thead class="text-muted border-b border-default">
              <tr class="text-left">
                <th class="font-medium px-5 py-3">#</th>
                <th class="font-medium px-5 py-3">Guest</th>
                <th class="font-medium px-5 py-3">Service</th>
                <th class="font-medium px-5 py-3">Date</th>
                <th class="font-medium px-5 py-3">Party</th>
                <th class="font-medium px-5 py-3">Status</th>
                <th class="font-medium px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="b in filtered"
                :key="b.id"
                class="border-b border-default/60 hover:bg-elevated/40 transition-colors"
              >
                <td class="px-5 py-3 text-muted tabular-nums">{{ b.id }}</td>
                <td class="px-5 py-3 font-medium">{{ b.guest }}</td>
                <td class="px-5 py-3">{{ b.service }}</td>
                <td class="px-5 py-3 text-muted">{{ b.date }}</td>
                <td class="px-5 py-3">
                  <span class="inline-flex items-center gap-1">
                    <UIcon name="i-lucide-users" class="size-3.5 text-muted" />{{ b.party }}
                  </span>
                </td>
                <td class="px-5 py-3">
                  <UBadge :color="statusColor[b.status]" variant="subtle" class="capitalize">
                    {{ b.status }}
                  </UBadge>
                </td>
                <td class="px-5 py-3 text-right">
                  <UDropdownMenu :items="rowMenu(b)">
                    <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="sm" />
                  </UDropdownMenu>
                </td>
              </tr>
            </tbody>
          </table>
        </UCard>
      </main>

      <!-- New booking modal (v4 pattern) -->
      <UModal v-model:open="isModalOpen">
        <template #content="{ close }">
          <div class="p-6">
            <div class="flex items-center gap-3 mb-5">
              <div class="size-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <UIcon name="i-lucide-calendar-plus" class="size-5 text-primary" />
              </div>
              <div>
                <h3 class="text-lg font-semibold">New booking</h3>
                <p class="text-sm text-muted">Add a reservation to today’s service</p>
              </div>
            </div>

            <div class="space-y-4">
              <UFormField label="Guest name" name="guest">
                <UInput v-model="form.guest" placeholder="e.g. Jordan Lee" class="w-full" />
              </UFormField>
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Service" name="service">
                  <USelect
                    v-model="form.service"
                    :items="['Tasting Menu', 'Wine Pairing', 'Chef’s Table', 'Brunch']"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Party size" name="party">
                  <UInputNumber v-model="form.party" :min="1" :max="12" class="w-full" />
                </UFormField>
              </div>
              <UFormField label="Date & time" name="date">
                <UInput v-model="form.date" placeholder="Jun 28, 19:30" icon="i-lucide-clock" class="w-full" />
              </UFormField>
            </div>

            <div class="flex justify-end gap-2 mt-6">
              <UButton color="neutral" variant="ghost" @click="close">Cancel</UButton>
              <UButton color="primary" icon="i-lucide-check" @click="createBooking">Create booking</UButton>
            </div>
          </div>
        </template>
      </UModal>
    </div>
  </UApp>
</template>
