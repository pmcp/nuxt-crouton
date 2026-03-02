<script setup lang="ts">
/**
 * LiquidGlass Effect Component
 *
 * Apple-style glassmorphism effect using SVG displacement filters.
 * Adapted from Inspira UI (https://inspira-ui.com)
 *
 * Note: SVG backdrop-filter is best supported in Chromium browsers.
 * Falls back to standard backdrop-blur in Safari/Firefox.
 */
import type { HTMLAttributes } from 'vue'

interface Props {
  radius?: number
  border?: number
  lightness?: number
  blend?: string
  xChannel?: 'R' | 'G' | 'B'
  yChannel?: 'R' | 'G' | 'B'
  alpha?: number
  blur?: number
  rOffset?: number
  gOffset?: number
  bOffset?: number
  scale?: number
  frost?: number
  class?: HTMLAttributes['class']
  containerClass?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  radius: 16,
  border: 0.07,
  lightness: 50,
  blend: 'difference',
  xChannel: 'R',
  yChannel: 'B',
  alpha: 0.93,
  blur: 11,
  rOffset: 0,
  gOffset: 10,
  bOffset: 20,
  scale: -180,
  frost: 0.05,
})

// Unique filter ID per instance to avoid SVG filter collisions
const filterId = `liquid-glass-${useId()}`

const liquidGlassRoot = ref<HTMLElement | null>(null)
const dimensions = reactive({
  width: 0,
  height: 0,
})

let observer: ResizeObserver | null = null

const baseStyle = computed(() => ({
  '--frost': props.frost,
  '--lg-filter-id': `url(#${filterId})`,
  'border-radius': `${props.radius}px`,
}))

const displacementImage = computed(() => {
  const border = Math.min(dimensions.width, dimensions.height) * (props.border * 0.5)
  const yBorder = Math.min(dimensions.width, dimensions.height) * (props.border * 0.5)

  return `
    <svg viewBox="0 0 ${dimensions.width} ${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${filterId}-red" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#0000"/>
          <stop offset="100%" stop-color="red"/>
        </linearGradient>
        <linearGradient id="${filterId}-blue" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0000"/>
          <stop offset="100%" stop-color="blue"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${dimensions.width}" height="${dimensions.height}" fill="black"></rect>
      <rect x="0" y="0" width="${dimensions.width}" height="${dimensions.height}" rx="${props.radius}" fill="url(#${filterId}-red)" />
      <rect x="0" y="0" width="${dimensions.width}" height="${dimensions.height}" rx="${props.radius}" fill="url(#${filterId}-blue)" style="mix-blend-mode: ${props.blend}" />
      <rect
        x="${border}"
        y="${yBorder}"
        width="${dimensions.width - border * 2}"
        height="${dimensions.height - border * 2}"
        rx="${props.radius}"
        fill="hsl(0 0% ${props.lightness}% / ${props.alpha})"
        style="filter:blur(${props.blur}px)"
      />
    </svg>
  `
})

const displacementDataUri = computed(() => {
  const encoded = encodeURIComponent(displacementImage.value)
  return `data:image/svg+xml,${encoded}`
})

onMounted(() => {
  if (!liquidGlassRoot.value) return

  observer = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return

    let width = 0
    let height = 0

    if (entry.borderBoxSize?.length) {
      width = entry.borderBoxSize[0]!.inlineSize
      height = entry.borderBoxSize[0]!.blockSize
    }
    else if (entry.contentRect) {
      width = entry.contentRect.width
      height = entry.contentRect.height
    }

    dimensions.width = width
    dimensions.height = height
  })

  observer.observe(liquidGlassRoot.value)
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <div
    ref="liquidGlassRoot"
    class="liquid-glass-effect"
    :class="[props.containerClass]"
    :style="baseStyle"
  >
    <div
      class="liquid-glass-slot"
      :class="[props.class]"
    >
      <slot />
    </div>

    <svg
      class="liquid-glass-filter"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter
          :id="filterId"
          color-interpolation-filters="sRGB"
        >
          <feImage
            x="0"
            y="0"
            width="100%"
            height="100%"
            :href="displacementDataUri"
            result="map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            :xChannelSelector="xChannel"
            :yChannelSelector="yChannel"
            :scale="scale + rOffset"
            result="dispRed"
          />
          <feColorMatrix
            in="dispRed"
            type="matrix"
            values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"
            result="red"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            :xChannelSelector="xChannel"
            :yChannelSelector="yChannel"
            :scale="scale + gOffset"
            result="dispGreen"
          />
          <feColorMatrix
            in="dispGreen"
            type="matrix"
            values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0"
            result="green"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            :xChannelSelector="xChannel"
            :yChannelSelector="yChannel"
            :scale="scale + bOffset"
            result="dispBlue"
          />
          <feColorMatrix
            in="dispBlue"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0"
            result="blue"
          />
          <feBlend
            in="red"
            in2="green"
            mode="screen"
            result="rg"
          />
          <feBlend
            in="rg"
            in2="blue"
            mode="screen"
          />
        </filter>
      </defs>
    </svg>
  </div>
</template>

<style scoped>
.liquid-glass-effect {
  position: relative;
  display: block;
  border-radius: inherit;
  backdrop-filter: var(--lg-filter-id, blur(12px));
  background: light-dark(hsl(0 0% 100% / var(--frost, 0)), hsl(0 0% 0% / var(--frost, 0)));
  box-shadow:
    0 0 2px 1px
      light-dark(
        color-mix(in oklch, canvasText, #0000 85%),
        color-mix(in oklch, canvasText, #0000 90%)
      )
      inset,
    0 0 10px 4px
      light-dark(
        color-mix(in oklch, canvasText, #0000 90%),
        color-mix(in oklch, canvasText, #0000 95%)
      )
      inset,
    0px 4px 16px rgba(17, 17, 26, 0.05),
    0px 8px 24px rgba(17, 17, 26, 0.05),
    0px 16px 56px rgba(17, 17, 26, 0.05),
    0px 4px 16px rgba(17, 17, 26, 0.05) inset,
    0px 8px 24px rgba(17, 17, 26, 0.05) inset,
    0px 16px 56px rgba(17, 17, 26, 0.05) inset;
}

/* Fallback for Safari/Firefox: standard glassmorphism */
@supports not (backdrop-filter: url(#test)) {
  .liquid-glass-effect {
    backdrop-filter: blur(12px) saturate(180%);
    background: light-dark(hsl(0 0% 100% / 0.7), hsl(0 0% 0% / 0.5));
  }
}

.liquid-glass-slot {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
}

.liquid-glass-filter {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
