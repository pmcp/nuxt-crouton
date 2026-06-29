<script setup lang="ts">
/** SpikeNavBlock (#956) — a recognizable BOTTOM NAV / tabbar block (icons + labels). The natural thing
 *  to PIN to the bottom: short, full-width, clearly a nav bar. */
const tabs = [
  { icon: 'i-lucide-home', label: 'Home', active: true },
  { icon: 'i-lucide-calendar', label: 'Shows', active: false },
  { icon: 'i-lucide-plus-circle', label: 'Add', active: false },
  { icon: 'i-lucide-user', label: 'Me', active: false },
]
</script>

<template>
  <div class="flex h-full w-full items-center justify-around px-2">
    <div v-for="t in tabs" :key="t.label" class="flex flex-col items-center gap-0.5" :class="t.active ? 'text-primary' : 'text-dimmed'">
      <UIcon :name="t.icon" class="size-5" />
      <span class="text-[10px] font-medium">{{ t.label }}</span>
    </div>
  </div>
</template>
