<script setup lang="ts">
/**
 * Separator Block Public Renderer
 *
 * Renders a separator using USeparator for public display.
 */
import type { SeparatorBlockAttrs } from '../../../types/blocks'

interface Props {
  attrs: SeparatorBlockAttrs
}

const props = defineProps<Props>()

// Border style class
const borderStyle = computed(() => {
  const type = props.attrs.type || 'solid'
  return {
    solid: 'border-solid',
    dashed: 'border-dashed',
    dotted: 'border-dotted'
  }[type] || 'border-solid'
})
</script>

<template>
  <div class="my-8">
    <USeparator
      :label="attrs.label"
      :icon="attrs.icon"
      :class="borderStyle"
    />
  </div>
</template>
