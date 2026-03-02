<script setup lang="ts">
/**
 * Liquid Glass Block Public Renderer
 *
 * Renders an Apple-style liquid glass card with frosted transparency.
 * Uses SVG displacement filters for the glass distortion effect.
 * Falls back to standard backdrop-blur in unsupported browsers.
 */
import type { LiquidGlassBlockAttrs } from '../../../types/blocks'

interface Props {
  attrs: LiquidGlassBlockAttrs
}

const props = defineProps<Props>()

const frost = computed(() => Number(props.attrs.frost) || 0.05)
const radius = computed(() => Number(props.attrs.radius) || 20)
</script>

<template>
  <div class="liquid-glass-block relative py-12">
    <!-- Decorative background pattern -->
    <div class="absolute inset-0 overflow-hidden rounded-2xl">
      <div class="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      <div class="liquid-glass-dots absolute inset-0" />
    </div>

    <!-- Glass Card -->
    <ClientOnly>
      <CroutonPagesEffectsLiquidGlass
        :frost="frost"
        :radius="radius"
        container-class="relative mx-auto max-w-lg"
      >
        <div class="flex flex-col items-center gap-4 px-8 py-10 text-center">
          <UIcon
            v-if="attrs.icon"
            :name="attrs.icon"
            class="size-10 text-primary"
          />
          <h3 class="text-xl font-bold text-[var(--ui-text-highlighted)]">
            {{ attrs.title }}
          </h3>
          <p v-if="attrs.description" class="text-sm text-muted leading-relaxed max-w-sm">
            {{ attrs.description }}
          </p>
        </div>
      </CroutonPagesEffectsLiquidGlass>

      <template #fallback>
        <!-- SSR fallback: standard glass card -->
        <div
          class="relative mx-auto max-w-lg backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 shadow-xl"
          :style="{ borderRadius: `${radius}px` }"
        >
          <div class="flex flex-col items-center gap-4 px-8 py-10 text-center">
            <UIcon
              v-if="attrs.icon"
              :name="attrs.icon"
              class="size-10 text-primary"
            />
            <h3 class="text-xl font-bold text-[var(--ui-text-highlighted)]">
              {{ attrs.title }}
            </h3>
            <p v-if="attrs.description" class="text-sm text-muted leading-relaxed max-w-sm">
              {{ attrs.description }}
            </p>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.liquid-glass-dots {
  background-image: radial-gradient(circle, var(--ui-border) 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: 0.4;
}
</style>
