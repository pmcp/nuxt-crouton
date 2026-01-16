<script setup lang="ts">
/**
 * Section Block Public Renderer
 *
 * Renders a section block using UPageSection for public display.
 */
import type { SectionBlockAttrs } from '../../../types/blocks'

interface Props {
  attrs: SectionBlockAttrs
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

// Map features to UPageSection format
const features = computed(() => {
  if (!props.attrs.features?.length) return []
  return props.attrs.features.map(f => ({
    title: f.title,
    description: f.description,
    icon: f.icon
  }))
})
</script>

<template>
  <UPageSection
    :headline="attrs.headline"
    :icon="attrs.icon"
    :title="attrs.title"
    :description="attrs.description"
    :orientation="attrs.orientation"
    :reverse="attrs.reverse"
    :links="buttonLinks"
    :features="features"
  />
</template>
