<script setup lang="ts">
/** @route /admin/[team]/sales/products */
definePageMeta({ middleware: ['auth'] })
</script>

<template>
  <SalesProductsList />
</template>
