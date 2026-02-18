<script setup lang="ts">
/**
 * Two Column Block Public Renderer
 *
 * Renders a two-column side-by-side layout for public display.
 */
import type { TwoColumnBlockAttrs } from '../../../types/blocks'

interface Props {
  attrs: TwoColumnBlockAttrs
}

const props = defineProps<Props>()

const gridClass = computed(() => {
  const map: Record<string, string> = {
    '1/3': 'grid-cols-[1fr_2fr]',
    '2/3': 'grid-cols-[2fr_1fr]',
    '1/2': 'grid-cols-2'
  }
  return `grid gap-8 sm:gap-12 ${map[props.attrs.split || '1/2'] ?? 'grid-cols-2'}`
})

const leftButtons = computed(() =>
  (props.attrs.leftLinks || []).map(link => ({
    label: link.label,
    to: link.to,
    color: link.color || 'primary',
    variant: link.variant || 'solid',
    icon: link.icon,
    target: link.external ? '_blank' : undefined
  }))
)

const rightButtons = computed(() =>
  (props.attrs.rightLinks || []).map(link => ({
    label: link.label,
    to: link.to,
    color: link.color || 'primary',
    variant: link.variant || 'solid',
    icon: link.icon,
    target: link.external ? '_blank' : undefined
  }))
)
</script>

<template>
  <div class="two-column-block">
    <div :class="gridClass">
      <!-- Left column -->
      <div class="flex flex-col gap-4">
        <img
          v-if="attrs.leftImage"
          :src="attrs.leftImage"
          class="w-full rounded-xl object-cover"
          :alt="attrs.leftImageAlt || ''"
        />
        <h3 v-if="attrs.leftTitle" class="text-xl sm:text-2xl font-bold">
          {{ attrs.leftTitle }}
        </h3>
        <p v-if="attrs.leftDescription" class="text-muted leading-relaxed">
          {{ attrs.leftDescription }}
        </p>
        <div v-if="leftButtons.length" class="flex flex-wrap gap-3">
          <UButton
            v-for="(btn, i) in leftButtons"
            :key="i"
            v-bind="btn"
          />
        </div>
      </div>

      <!-- Right column -->
      <div class="flex flex-col gap-4">
        <img
          v-if="attrs.rightImage"
          :src="attrs.rightImage"
          class="w-full rounded-xl object-cover"
          :alt="attrs.rightImageAlt || ''"
        />
        <h3 v-if="attrs.rightTitle" class="text-xl sm:text-2xl font-bold">
          {{ attrs.rightTitle }}
        </h3>
        <p v-if="attrs.rightDescription" class="text-muted leading-relaxed">
          {{ attrs.rightDescription }}
        </p>
        <div v-if="rightButtons.length" class="flex flex-wrap gap-3">
          <UButton
            v-for="(btn, i) in rightButtons"
            :key="i"
            v-bind="btn"
          />
        </div>
      </div>
    </div>
  </div>
</template>
