<script setup lang="ts">
// Test sales app - dogfooding crouton-sales package
</script>

<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Test Sales App</h1>
    <p class="text-neutral-600 mb-8">Dogfooding the @friendlyinternet/crouton-sales package</p>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <!-- Core Collections -->
      <UCard>
        <template #header>
          <h2 class="font-semibold">Events</h2>
        </template>
        <NuxtLink to="/admin/sales-events" class="text-primary">
          Manage Events
        </NuxtLink>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">Products</h2>
        </template>
        <NuxtLink to="/admin/sales-products" class="text-primary">
          Manage Products
        </NuxtLink>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">Categories</h2>
        </template>
        <NuxtLink to="/admin/sales-categories" class="text-primary">
          Manage Categories
        </NuxtLink>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">Orders</h2>
        </template>
        <NuxtLink to="/admin/sales-orders" class="text-primary">
          Manage Orders
        </NuxtLink>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">Locations</h2>
        </template>
        <NuxtLink to="/admin/sales-locations" class="text-primary">
          Manage Locations
        </NuxtLink>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">Clients</h2>
        </template>
        <NuxtLink to="/admin/sales-clients" class="text-primary">
          Manage Clients
        </NuxtLink>
      </UCard>

      <!-- POS Interface -->
      <UCard class="md:col-span-2 lg:col-span-3 border-primary">
        <template #header>
          <h2 class="font-semibold text-primary">Order Interface</h2>
        </template>
        <p class="text-sm text-neutral-600 mb-4">
          Test the SalesClientOrderInterface component
        </p>
        <NuxtLink to="/order" class="text-primary font-medium">
          Open POS Interface
        </NuxtLink>
      </UCard>
    </div>
  </div>
</template>
