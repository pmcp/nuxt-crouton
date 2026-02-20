<template>
  <div
    v-if="!isOnline"
    class="bg-amber-500 text-white px-4 py-2 flex items-center gap-2"
  >
    <UIcon name="i-lucide-wifi-off" />
    <span>{{ t('sales.offline.banner') }}</span>
  </div>
</template>

<script setup lang="ts">
const isOnline = useOnline()
const { t } = useT()
</script>
