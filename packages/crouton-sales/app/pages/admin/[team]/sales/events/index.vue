<script setup lang="ts">
/** @route /admin/[team]/sales/events */
definePageMeta({ middleware: ['auth'] })
</script>

<template>
  <SalesEventsList />
</template>
