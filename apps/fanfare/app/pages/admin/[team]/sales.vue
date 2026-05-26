<script setup lang="ts">
/**
 * Fanfare Sales Section Parent Layout
 *
 * Shadows the package sales.vue to conditionally hide the top
 * tab navigation on events pages for a cleaner view.
 *
 * @route /admin/[team]/sales
 */
definePageMeta({
  middleware: ['auth'],
  layout: 'admin'
})

const route = useRoute()
const { teamSlug } = useTeamContext()
const { t } = useT()

const isEventsRoute = computed(() =>
  route.path.includes('/sales/events')
)

const tabs = computed(() => [
  [
    {
      label: t('sales.admin.overview'),
      icon: 'i-lucide-shopping-cart',
      to: `/admin/${teamSlug.value}/sales`,
      exact: true
    },
    {
      label: t('sales.sidebar.events'),
      icon: 'i-lucide-calendar',
      to: `/admin/${teamSlug.value}/sales/events`
    },
    {
      label: t('sales.sidebar.products'),
      icon: 'i-lucide-package',
      to: `/admin/${teamSlug.value}/sales/products`
    },
    {
      label: t('sales.sidebar.categories'),
      icon: 'i-lucide-folder',
      to: `/admin/${teamSlug.value}/sales/categories`
    },
    {
      label: t('sales.orders.title'),
      icon: 'i-lucide-receipt',
      to: `/admin/${teamSlug.value}/sales/orders`
    },
    {
      label: t('sales.sidebar.locations'),
      icon: 'i-lucide-map-pin',
      to: `/admin/${teamSlug.value}/sales/locations`
    },
    {
      label: t('sales.sidebar.printers'),
      icon: 'i-lucide-printer',
      to: `/admin/${teamSlug.value}/sales/printers`
    },
    {
      label: t('sales.sidebar.helpers'),
      icon: 'i-lucide-users',
      to: `/admin/${teamSlug.value}/sales/helpers`
    },
    {
      label: t('sales.sidebar.clients'),
      icon: 'i-lucide-user',
      to: `/admin/${teamSlug.value}/sales/clients`
    }
  ]
])
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('sales.admin.sectionTitle')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UNavigationMenu
        v-if="!isEventsRoute"
        :items="tabs"
        orientation="horizontal"
        highlight
        highlight-color="primary"
        class="border-b border-default px-4"
      />
    </template>

    <template #body>
      <div class="max-w-6xl mx-auto w-full">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
