<script setup lang="ts">
// Test page for crouton-bookings package
const { isEmailEnabled } = useBookingEmail()
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="container mx-auto py-8 px-4">
      <h1 class="text-3xl font-bold mb-4">Crouton Bookings Test App</h1>

      <div class="space-y-6">
        <!-- Package Status -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">Package Status</h2>
          </template>

          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-success" />
              <span>crouton-bookings package loaded</span>
            </div>
            <div class="flex items-center gap-2">
              <UIcon
                :name="isEmailEnabled ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                :class="isEmailEnabled ? 'text-success' : 'text-muted'"
                class="w-5 h-5"
              />
              <span>Email module {{ isEmailEnabled ? 'enabled' : 'disabled' }}</span>
            </div>
          </div>
        </UCard>

        <!-- Available Components -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">Available Components</h2>
          </template>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="p-3 bg-muted/50 rounded-lg">
              <code class="text-sm">CroutonBookingWeekStrip</code>
            </div>
            <div class="p-3 bg-muted/50 rounded-lg">
              <code class="text-sm">CroutonBookingDateBadge</code>
            </div>
            <div class="p-3 bg-muted/50 rounded-lg">
              <code class="text-sm">CroutonBookingBookingSidebarPanel</code>
            </div>
            <div class="p-3 bg-muted/50 rounded-lg">
              <code class="text-sm">CroutonBookingCustomerBookingWizard</code>
            </div>
            <div class="p-3 bg-muted/50 rounded-lg">
              <code class="text-sm">CroutonBookingAdminCalendar</code>
            </div>
            <div class="p-3 bg-muted/50 rounded-lg">
              <code class="text-sm">CroutonBookingSlotIndicator</code>
            </div>
          </div>
        </UCard>

        <!-- Available Composables -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">Available Composables</h2>
          </template>

          <div class="grid grid-cols-2 gap-4">
            <div class="p-3 bg-muted/50 rounded-lg">
              <code class="text-sm">useBookingAvailability</code>
            </div>
            <div class="p-3 bg-muted/50 rounded-lg">
              <code class="text-sm">useBookingCart</code>
            </div>
            <div class="p-3 bg-muted/50 rounded-lg">
              <code class="text-sm">useCustomerBooking</code>
            </div>
            <div class="p-3 bg-muted/50 rounded-lg">
              <code class="text-sm">useBookingsSettings</code>
            </div>
            <div class="p-3 bg-muted/50 rounded-lg">
              <code class="text-sm">useBookingEmail</code>
            </div>
          </div>
        </UCard>

        <!-- Next Steps -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">Next Steps</h2>
          </template>

          <ol class="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Run <code class="bg-muted px-1 rounded">pnpm crouton generate</code> to generate collections</li>
            <li>Run <code class="bg-muted px-1 rounded">npx nuxt db:generate</code> to generate migrations</li>
            <li>Run <code class="bg-muted px-1 rounded">npx nuxt db:migrate</code> to apply migrations</li>
            <li>Start using the booking components and composables</li>
          </ol>
        </UCard>
      </div>
    </div>
  </div>
</template>
