<script setup lang="ts">
/**
 * Logo Block Public Renderer
 *
 * Renders a logo block using Nuxt UI's UPageLogos component.
 * Supports icon names and image URLs, with optional marquee effect.
 *
 * NOTE: This component must NOT use top-level await (no async setup).
 * It is rendered via dynamic <component :is> inside BlockContent.vue
 * which has no <Suspense> boundary.
 */
import type { LogoBlockAttrs, LogoItem } from '../../../types/blocks'

interface Props {
  attrs: LogoBlockAttrs
}

const props = defineProps<Props>()

/**
 * Convert LogoItem[] to the format UPageLogos expects:
 * - Icon items stay as strings
 * - Image items become { src, alt } objects
 * Checks explicit type field first, falls back to i- prefix detection
 */
const pageLogosItems = computed(() => {
  if (!props.attrs.items?.length) return []
  return props.attrs.items
    .filter((item: LogoItem) => item.value)
    .map((item: LogoItem) => {
      const isIcon = item.type === 'icon' || (!item.type && item.value?.startsWith('i-'))
      if (isIcon) {
        return item.value
      }
      return { src: item.value, alt: item.alt || '' }
    })
})
</script>

<template>
  <UPageLogos
    :title="attrs.title"
    :items="pageLogosItems"
    :marquee="attrs.marquee || false"
    class="my-8"
  />
</template>
