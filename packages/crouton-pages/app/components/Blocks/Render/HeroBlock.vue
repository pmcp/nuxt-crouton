<script setup lang="ts">
/**
 * Hero Block Public Renderer
 *
 * Renders a hero block using UPageHero for public display.
 */
import type { HeroBlockAttrs, BlockSize } from '../../../types/blocks'

interface Props {
  attrs: HeroBlockAttrs
  /** Whether this is the first block on the page */
  isFirst?: boolean
}

const props = defineProps<Props>()

// Block size — read from the common blockSize attr
const blockSize = computed(() => (props.attrs as any)?.blockSize as BlockSize | undefined)

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

// Tighten default padding — UPageHero defaults are too aggressive (py-24 sm:py-32 lg:py-40)
// Reduce top further when hero is the first block since the layout already provides top spacing
const heroUi = computed(() => {
  const base = 'pb-12 sm:pb-16 lg:pb-20'
  if (props.isFirst) {
    return { container: `pt-8 sm:pt-12 lg:pt-16 ${base}` }
  }
  return { container: `pt-16 sm:pt-20 lg:pt-24 ${base}` }
})
</script>

<template>
  <div :class="['hero-block', blockSize === 'wide' && 'hero-wide', blockSize === 'full' && 'hero-full']">
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
  </div>
</template>

<style scoped>
/* Override UContainer's --ui-container variable so the inner container expands */
.hero-wide {
  --ui-container: 64rem;
}

.hero-full {
  --ui-container: 100%;
}
</style>
