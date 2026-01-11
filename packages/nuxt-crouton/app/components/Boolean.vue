<script setup lang="ts">
interface Props {
  value?: boolean | null
}

defineProps<Props>()
</script>

<template>
  <UIcon
    v-if="value === true"
    name="i-lucide-check"
    class="size-4 text-green-500"
  />
  <UIcon
    v-else-if="value === false"
    name="i-lucide-x"
    class="size-4 text-neutral-400"
  />
  <span v-else class="text-neutral-400">—</span>
</template>
