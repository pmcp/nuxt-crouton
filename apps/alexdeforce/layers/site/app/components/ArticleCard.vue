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
      class="inline-block border-b-2 border-white hover:border-black pt-1"
    >
      {{ title }}
    </NuxtLink>
    <span v-if="tags?.length" class="uppercase text-xs">
      [<span v-for="(t, i) in tags" :key="t">{{ t }}<span v-if="i !== tags.length - 1">, </span></span>]
    </span>
  </li>
</template>
