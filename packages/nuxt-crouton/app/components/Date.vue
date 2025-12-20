<script setup lang="ts">
interface Props {
  date?: string | Date
}

defineProps<Props>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <NuxtTime
      v-if="date"
      :datetime="date"
      numeric="auto"
      style="long"
    />
    <div class="text-xs italic opacity-50">
      <NuxtTime
        v-if="date"
        :datetime="date"
        numeric="auto"
        style="long"
        relative
      />
    </div>
  </div>
</template>
