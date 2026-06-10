<script setup lang="ts">
/**
 * QR Code (`<CroutonQrCode />`)
 *
 * Renders any string (typically a URL) as a scannable QR code. Uses `uqr` to
 * generate an inline SVG — zero runtime dependencies, deterministic, and
 * SSR/prerender-safe (no canvas, no network). The wrapper controls the display
 * size; the SVG scales to fill it.
 *
 * @example
 * <CroutonQrCode :data="`https://acme.com/order`" :size="220" />
 */
import { renderSVG } from 'uqr'

interface Props {
  /** The string to encode (a URL, in most cases). */
  data: string
  /** Rendered size in pixels (square). */
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 200
})

// uqr returns a complete <svg> string. Content is generated from `data`, never
// raw user HTML, so v-html is safe here.
const svg = computed(() => (props.data ? renderSVG(props.data, { border: 1 }) : ''))
</script>

<template>
  <div
    v-if="data"
    class="crouton-qr inline-flex bg-white rounded-lg p-2"
    :style="{ width: `${size}px`, height: `${size}px` }"
    v-html="svg"
  />
</template>

<style scoped>
.crouton-qr :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>