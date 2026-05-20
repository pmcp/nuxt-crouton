<script setup lang="ts">
/** @route /admin/[team]/sales/locations */
definePageMeta({ middleware: ['auth'] })
</script>

<template>
  <SalesLocationsList />
</template>
