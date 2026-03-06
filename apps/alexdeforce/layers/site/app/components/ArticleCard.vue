<script setup lang="ts">
interface Props {
  title: string
  date?: string
  category?: string
  slug: string
  tags?: string[]
}

const props = defineProps<Props>()

const link = computed(() => {
  if (props.category) {
    return `/archive/${props.category}/${props.slug}`
  }
  return `/archive/${props.slug}`
})
</script>

<template>
  <li class="py-1">
    <NuxtLink
      :to="link"
      class="inline-block border-b-2 border-white hover:border-black pt-1 transition-colors"
    >
      {{ title }}
    </NuxtLink>
    <span v-if="tags?.length" class="ml-2 text-xs text-gray-400">
      {{ tags.join(', ') }}
    </span>
  </li>
</template>
