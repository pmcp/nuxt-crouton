<script setup lang="ts">
const props = defineProps<{
  title: string
  age?: string | null
  cardImage?: string | null
  categoryColor?: string | null
  slug: string
  locale: string
}>()

const link = computed(() => `/${props.locale}/aanbod/${props.slug}`)
</script>

<template>
  <NuxtLink
    :to="link"
    class="group relative block rounded-2xl overflow-hidden aspect-[4/3] transition-transform hover:scale-[1.02]"
    :style="{ backgroundColor: categoryColor || '#0d9488' }"
  >
    <img
      v-if="cardImage"
      :src="`/images/${cardImage}`"
      :alt="title"
      class="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-80 group-hover:opacity-90 transition-opacity"
    >
    <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
    <div class="absolute bottom-0 left-0 right-0 p-4 text-white">
      <h3 class="font-bold text-lg leading-tight">{{ title }}</h3>
      <p v-if="age" class="text-sm text-white/80 mt-0.5">{{ age }}</p>
    </div>
  </NuxtLink>
</template>
