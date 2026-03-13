<script setup lang="ts">
defineProps<{
  title: string
  street: string
  zip: string
  city: string
  isMain?: boolean
}>()
</script>

<template>
  <div class="bg-white rounded-none border border-neutral-200 p-5">
    <h3 class="font-semibold text-neutral-900 mb-2">{{ title }}</h3>
    <p class="text-sm text-neutral-600 leading-relaxed">
      {{ street }}<br>
      {{ zip }} {{ city }}
    </p>
    <UBadge v-if="isMain" color="primary" variant="subtle" size="xs" class="mt-3">
      Hoofdschool
    </UBadge>
  </div>
</template>
