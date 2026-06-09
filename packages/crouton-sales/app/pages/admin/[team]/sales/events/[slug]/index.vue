<script setup lang="ts">
/**
 * Event Workspace page
 *
 * Thin wrapper around <SalesEventWorkspaceShell />. The shell owns the header +
 * tabs + data fetching; this page just supplies the route params and turns on
 * URL tab persistence (`?tab=`) so admin tabs are deep-linkable.
 *
 * @route /admin/[team]/sales/events/[slug]
 */
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const eventSlug = computed(() => route.params.slug as string)
</script>

<template>
  <div class="p-6">
    <SalesEventWorkspaceShell :event-slug="eventSlug" tab-param="tab" />
  </div>
</template>