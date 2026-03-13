<script setup lang="ts">
const active = ref(0)
let interval: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  interval = setInterval(() => {
    active.value++
    if (active.value > 9) active.value = 0
  }, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})

const computedImage = computed(() => {
  return `/assets/animatedBanner/animatie header_${active.value + 1}.svg`
})
</script>

<template>
  <img :src="computedImage" alt="" class="w-full h-auto" />
</template>
