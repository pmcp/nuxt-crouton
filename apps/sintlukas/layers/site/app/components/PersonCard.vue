<script setup lang="ts">
defineProps<{
  firstName: string
  lastName: string
  role?: string | null
  image?: string | null
}>()
</script>

<template>
  <div class="text-center group">
    <div class="size-32 mx-auto rounded-full overflow-hidden bg-neutral-100 mb-3">
      <img
        v-if="image"
        :src="`/images/${image}`"
        :alt="`${firstName} ${lastName}`"
        class="size-full object-cover group-hover:scale-105 transition-transform duration-300"
      >
      <div v-else class="size-full flex items-center justify-center text-2xl font-bold text-neutral-400">
        {{ (firstName?.[0] || '') + (lastName?.[0] || '') }}
      </div>
    </div>
    <p class="font-medium text-neutral-900">{{ firstName }} {{ lastName }}</p>
    <p v-if="role" class="text-sm text-neutral-500">{{ role }}</p>
  </div>
</template>
