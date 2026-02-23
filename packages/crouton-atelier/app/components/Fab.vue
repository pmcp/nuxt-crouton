<script setup lang="ts">
const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    class="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl active:scale-95 transition-all duration-150 flex items-center justify-center"
    @click="emit('click')"
  >
    <UIcon name="i-lucide-plus" class="w-6 h-6" />
  </button>
</template>
