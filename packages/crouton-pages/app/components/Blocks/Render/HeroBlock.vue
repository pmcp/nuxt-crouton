<script setup lang="ts">
/**
 * Hero Block Public Renderer
 *
 * Renders a hero block using UPageHero for public display.
 */
import type { HeroBlockAttrs } from '../../../types/blocks'

interface Props {
  attrs: HeroBlockAttrs
  /** Whether this is the first block on the page */
  isFirst?: boolean
}

const props = defineProps<Props>()

// Map links to button props
const buttonLinks = computed(() => {
  if (!props.attrs.links?.length) return []
  return props.attrs.links.map(link => ({
    label: link.label,
    to: link.to,
    color: link.color || 'primary',
    variant: link.variant || 'solid',
    icon: link.icon,
    target: link.external ? '_blank' : undefined
  }))
})

// Reduce top padding when hero is the first block — the layout already provides top spacing
const heroUi = computed(() => {
  if (props.isFirst) {
    return { container: 'pt-0 sm:pt-0 lg:pt-0' }
  }
  return undefined
})
</script>

<template>
  <UPageHero
    :headline="attrs.headline"
    :title="attrs.title"
    :description="attrs.description"
    :orientation="attrs.orientation"
    :reverse="attrs.reverse"
    :links="buttonLinks"
    :ui="heroUi"
  >
    <template v-if="attrs.image" #default>
      <img
        :src="attrs.image"
        :alt="attrs.imageAlt || attrs.title"
        class="w-full rounded-lg shadow-xl"
      >
    </template>
  </UPageHero>
</template>
