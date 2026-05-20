<script setup lang="ts">
/** @route /admin/[team]/sales/clients */
definePageMeta({ middleware: ['auth'] })
</script>

<template>
  <SalesClientsList />
</template>
