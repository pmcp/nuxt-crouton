<script setup lang="ts">
/** @route /admin/[team]/sales/printers */
definePageMeta({ middleware: ['auth'] })
</script>

<template>
  <SalesPrintersList />
</template>
