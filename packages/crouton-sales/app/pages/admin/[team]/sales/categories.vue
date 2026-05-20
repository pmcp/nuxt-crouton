<script setup lang="ts">
/** @route /admin/[team]/sales/categories */
definePageMeta({ middleware: ['auth'] })
</script>

<template>
  <SalesCategoriesList />
</template>
