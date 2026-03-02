<script setup lang="ts">
/**
 * Stats Block Public Renderer
 *
 * Renders animated number counters with labels.
 * Numbers tick up when scrolled into view using the NumberTicker effect.
 */
import type { StatsBlockAttrs } from '../../../types/blocks'

interface Props {
  attrs: StatsBlockAttrs
}

const props = defineProps<Props>()

const gridClass = computed(() => {
  const cols = props.attrs.columns || 3
  return {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4'
  }[cols]
})
</script>

<template>
  <div class="stats-block py-12">
    <!-- Header -->
    <div
      v-if="attrs.headline || attrs.title || attrs.description"
      class="text-center mb-10"
    >
      <p v-if="attrs.headline" class="text-sm font-medium text-primary mb-2">
        {{ attrs.headline }}
      </p>
      <h2 v-if="attrs.title" class="text-2xl sm:text-3xl font-bold mb-4">
        {{ attrs.title }}
      </h2>
      <p v-if="attrs.description" class="text-lg text-muted max-w-2xl mx-auto">
        {{ attrs.description }}
      </p>
    </div>

    <!-- Stats Grid -->
    <div
      class="grid gap-8"
      :class="gridClass"
    >
      <div
        v-for="(stat, index) in attrs.stats || []"
        :key="index"
        class="stats-item text-center group"
      >
        <!-- Animated Number -->
        <div class="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--ui-text-highlighted)] mb-2">
          <span v-if="stat.prefix" class="text-primary">{{ stat.prefix }}</span>
          <CroutonPagesEffectsNumberTicker
            :value="stat.value"
            :duration="1200"
            :delay="index * 150"
            :decimal-places="String(stat.value).includes('.') ? 1 : 0"
          />
          <span v-if="stat.suffix" class="text-primary">{{ stat.suffix }}</span>
        </div>

        <!-- Label -->
        <p class="text-sm sm:text-base text-muted font-medium">
          {{ stat.label }}
        </p>

        <!-- Decorative underline -->
        <div class="mt-3 mx-auto w-12 h-0.5 rounded-full bg-primary/20 group-hover:bg-primary/50 group-hover:w-16 transition-all duration-300" />
      </div>
    </div>
  </div>
</template>
