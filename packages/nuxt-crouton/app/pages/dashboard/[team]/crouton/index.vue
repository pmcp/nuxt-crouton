y<template>
  <div class="p-6">
    <CroutonSetupDashboardIndex />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})
</script>
