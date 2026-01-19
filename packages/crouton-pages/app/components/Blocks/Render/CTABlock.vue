<script setup lang="ts">
/**
 * CTA Block Public Renderer
 *
 * Renders a call-to-action block using UPageCTA for public display.
 */
import type { CTABlockAttrs } from '../../../types/blocks'

interface Props {
  attrs: CTABlockAttrs
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
</script>

<template>
  <UPageCTA
    :title="attrs.title"
    :description="attrs.description"
    :orientation="attrs.orientation"
    :reverse="attrs.reverse"
    :variant="attrs.variant"
    :links="buttonLinks"
  />
</template>
