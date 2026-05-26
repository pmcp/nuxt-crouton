<script setup lang="ts">
/**
 * Fanfare Events Dashboard
 *
 * Wraps the SalesEventsList in grid mode with a nice header.
 *
 * @route /admin/[team]/sales/events
 */
definePageMeta({ middleware: ['auth'] })

const { t } = useT()
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ t('sales.events.title') }}</h1>
        <p class="text-muted text-sm mt-1">{{ t('sales.events.description') }}</p>
      </div>
    </div>

    <SalesEventsList layout="grid" />
  </div>
</template>
