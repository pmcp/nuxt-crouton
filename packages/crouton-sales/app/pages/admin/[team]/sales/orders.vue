<script setup lang="ts">
/** @route /admin/[team]/sales/orders */
definePageMeta({ middleware: ['auth'] })
</script>

<template>
  <SalesOrdersList />
</template>
