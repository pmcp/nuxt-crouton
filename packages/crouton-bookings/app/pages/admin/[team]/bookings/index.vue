<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const { t } = useI18n()
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('bookings.admin.title')">
        <template #right>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            :label="t('common.create')"
            @click="useCrouton().open('bookings-bookings', 'create')"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="h-full p-4">
        <CroutonCollection
          collection="bookings-bookings"
          layout="table"
          :columns="['date', 'slot', 'location', 'owner', 'status', 'createdAt']"
          :default-sort="{ field: 'date', direction: 'desc' }"
          :show-search="true"
          :show-pagination="true"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
