<script setup lang="ts">
/**
 * Course card — faithful port of original.
 * Flat colored background with thumbnail, centered white bold text overlay.
 * No rounded corners, no gradient.
 */
const props = defineProps<{
  title: string
  age?: string | null
  showSubtitle?: boolean
  cardImage?: string | null
  categoryColor?: string | null
  slug: string
  locale: string
  first?: boolean
  categoryName?: string | null
}>()

const link = computed(() => `/${props.locale}/aanbod/${props.slug}`)
</script>

<template>
  <div>
    <h2 v-if="first && categoryName" class="text-3xl uppercase font-bold pt-2 pb-4">{{ categoryName }}</h2>
    <NuxtLink :to="link" class="block w-full mb-2">
      <div class="overflow-hidden h-48 max-w-[20em] rounded-none shadow-none ring-0">
        <div
          class="relative h-full w-full bg-cover bg-center"
          :style="{
            backgroundColor: categoryColor || '#3e8b6f',
            backgroundImage: cardImage ? `url('${cardImage}')` : undefined
          }"
        >
          <div class="absolute z-20 top-0 left-0 w-full h-full flex justify-center items-center px-4 py-2 text-center">
            <div>
              <span class="text-white font-bold text-2xl">{{ title }}</span>
              <br v-if="showSubtitle && age">
              <span v-if="showSubtitle && age" class="text-white font-bold text-2xl">{{ age }}</span>
            </div>
          </div>
        </div>
      </div>
    </NuxtLink>
  </div>
</template>
