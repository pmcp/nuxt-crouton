<template>
  <div class="px-6 py-6">
    <!-- Page Header -->
    <div class="mb-6">
      <NuxtLink
        :to="`/dashboard/${route.params.team}/crouton`"
        class="hover:underline mb-4 inline-block text-sm text-muted-foreground"
      >
        ← Back to collections
      </NuxtLink>
      <h1 class="text-2xl font-bold">Multi-Collection View Example</h1>
      <p class="text-muted-foreground">
        Three collections displayed side by side with different layouts
      </p>
    </div>

    <!-- Three Column Grid Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Collection 1: Bookings -->
      <div class="border border-default rounded-lg overflow-hidden bg-card">
        <div class="p-4 border-b border-default bg-muted/30">
          <h2 class="font-semibold">Recent Bookings</h2>
          <p class="text-xs text-muted-foreground">Latest booking entries</p>
        </div>
        <div class="max-h-[600px] overflow-auto">
          <div v-if="bookingsPending" class="p-6 text-center text-muted-foreground">
            <p>Loading bookings...</p>
          </div>
          <CroutonCollection
            v-else-if="bookings && bookings.length > 0"
            layout="list"
            collection="bookingsBookings"
            :columns="bookingsColumns"
            :rows="bookings.slice(0, 8)"
            create
          >
            <template #header>
              <!-- No table header to save space -->
            </template>
            <template #location-cell="{ row }: { row: { original: CroutonBaseRow } }">
              <CroutonItemCardMini
                v-if="row.original.location"
                :id="row.original.location"
                collection="bookingsLocations"
              />
            </template>
            <template #date-cell="{ row }: { row: { original: CroutonBaseRow } }">
              <CroutonDate :date="row.original.date" />
            </template>
          </CroutonCollection>
          <div v-else class="p-6 text-center text-muted-foreground">
            <p>No bookings found</p>
            <p class="text-xs mt-2">Create your first booking</p>
          </div>
        </div>
      </div>

      <!-- Collection 2: Locations -->
      <div class="border border-default rounded-lg overflow-hidden bg-card">
        <div class="p-4 border-b border-default bg-muted/30">
          <h2 class="font-semibold">Locations</h2>
          <p class="text-xs text-muted-foreground">Available locations</p>
        </div>
        <div class="max-h-[600px] overflow-auto">
          <div v-if="locationsPending" class="p-6 text-center text-muted-foreground">
            <p>Loading locations...</p>
          </div>
          <CroutonCollection
            v-else-if="locations && locations.length > 0"
            layout="list"
            collection="bookingsLocations"
            :columns="locationsColumnsSimplified"
            :rows="locations.slice(0, 8)"
          >
            <template #header>
              <!-- No header -->
            </template>
          </CroutonCollection>
          <div v-else class="p-6 text-center text-muted-foreground">
            <p>No locations found</p>
            <p class="text-xs mt-2">Add your first location</p>
          </div>
        </div>
      </div>

      <!-- Collection 3: Activities (Mock) -->
      <div class="border border-default rounded-lg overflow-hidden bg-card">
        <div class="p-4 border-b border-default bg-muted/30">
          <h2 class="font-semibold">Recent Activity</h2>
          <p class="text-xs text-muted-foreground">Latest system events</p>
        </div>
        <div class="max-h-[600px] overflow-auto">
          <CroutonCollection
            v-if="activitiesData"
            layout="list"
            collection="activities"
            :columns="activitiesColumns"
            :rows="activitiesData.slice(0, 8)"
          >
            <template #header>
              <!-- No header -->
            </template>
          </CroutonCollection>
        </div>
      </div>
    </div>

    <!-- Responsive Layout Example -->
    <div class="mt-12">
      <h2 class="text-xl font-bold mb-4">Responsive Layout Example</h2>
      <p class="text-muted-foreground mb-6">
        Single collection that adapts: list on mobile, table on desktop
      </p>

      <div class="border border-default rounded-lg overflow-hidden bg-card">
        <div v-if="bookingsPending" class="p-6 text-center text-muted-foreground">
          <p>Loading bookings...</p>
        </div>
        <CroutonCollection
          v-else-if="bookings && bookings.length > 0"
          :layout="{ base: 'list', md: 'list', lg: 'table' }"
          collection="bookingsBookings"
          :columns="bookingsColumns"
          :rows="bookings.slice(0, 10)"
        >
          <template #header>
            <div class="p-4 border-b border-default">
              <h3 class="font-semibold">Responsive Bookings Table</h3>
              <p class="text-xs text-muted-foreground">Resize your browser to see layout changes</p>
            </div>
          </template>
          <template #location-cell="{ row }">
            <CroutonItemCardMini
              v-if="row.original.location"
              :id="row.original.location"
              collection="bookingsLocations"
            />
          </template>
          <template #date-cell="{ row }">
            <CroutonDate :date="row.original.date" />
          </template>
        </CroutonCollection>
      </div>
    </div>

    <!-- Two Column Layout Example -->
    <div class="mt-12">
      <h2 class="text-xl font-bold mb-4">Two Column Layout</h2>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Wide view 1: Bookings -->
        <div class="border border-default rounded-lg overflow-hidden bg-card">
          <div class="p-4 border-b border-default bg-muted/30">
            <h3 class="font-semibold">All Bookings</h3>
          </div>
          <div v-if="bookingsPending" class="p-6 text-center text-muted-foreground">
            <p>Loading...</p>
          </div>
          <CroutonCollection
            v-else-if="bookings && bookings.length > 0"
            layout="table"
            collection="bookingsBookings"
            :columns="bookingsColumns"
            :rows="bookings"
          >
            <template #location-cell="{ row }: { row: { original: CroutonBaseRow } }">
              <CroutonItemCardMini
                v-if="row.original.location"
                :id="row.original.location"
                collection="bookingsLocations"
              />
            </template>
            <template #date-cell="{ row }: { row: { original: CroutonBaseRow } }">
              <CroutonDate :date="row.original.date" />
            </template>
          </CroutonCollection>
        </div>

        <!-- Wide view 2: Locations -->
        <div class="border border-default rounded-lg overflow-hidden bg-card">
          <div class="p-4 border-b border-default bg-muted/30">
            <h3 class="font-semibold">All Locations</h3>
          </div>
          <div v-if="locationsPending" class="p-6 text-center text-muted-foreground">
            <p>Loading...</p>
          </div>
          <CroutonCollection
            v-else-if="locations && locations.length > 0"
            layout="list"
            collection="bookingsLocations"
            :columns="locationsColumnsSimplified"
            :rows="locations"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Base row type for table data
interface CroutonBaseRow {
  id: string
  location?: string
  date?: string
  [key: string]: unknown
}

const route = useRoute()

// Fetch real collection data
const { items: bookings, pending: bookingsPending } = await useCollectionQuery('bookingsBookings')
const { items: locations, pending: locationsPending } = await useCollectionQuery('bookingsLocations')

// Column definitions from the real collections
const bookingsColumns = [
  { accessorKey: 'location', header: 'Location' },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'slot', header: 'Slot' },
  { accessorKey: 'status', header: 'Status' }
]

// Simplified columns for locations (too many columns for narrow view)
const locationsColumnsSimplified = [
  { accessorKey: 'title', header: 'Title' },
  { accessorKey: 'city', header: 'City' }
]

// Mock activity data for third column (replace with real collection if you have one)
const activitiesData = ref([
  { id: '1', title: 'New booking created', description: 'Booking added for next week', createdAt: new Date() },
  { id: '2', title: 'Location updated', description: 'Opening hours changed', createdAt: new Date() },
  { id: '3', title: 'Slot cancelled', description: 'Maintenance scheduled', createdAt: new Date() },
  { id: '4', title: 'New location added', description: 'Downtown office opened', createdAt: new Date() },
  { id: '5', title: 'Booking confirmed', description: 'Customer confirmed attendance', createdAt: new Date() },
  { id: '6', title: 'Status changed', description: 'Booking marked as completed', createdAt: new Date() },
  { id: '7', title: 'Reminder sent', description: 'Email reminder to customer', createdAt: new Date() },
  { id: '8', title: 'Report generated', description: 'Monthly booking stats ready', createdAt: new Date() }
])

const activitiesColumns = [
  { accessorKey: 'title', header: 'Activity' },
  { accessorKey: 'description', header: 'Details' }
]

definePageMeta({
  middleware: 'auth'
})
</script>
