<script setup lang="ts">
import SignaturePadLib from 'signature_pad'

// Accept null | string | object (scaffolded `json` field defaults to {}). Only data URLs
// get rendered into the canvas — anything else is treated as "empty".
const model = defineModel<unknown>()

function isDataUrl(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('data:image/')
}

const canvasEl = ref<HTMLCanvasElement | null>(null)
let pad: SignaturePadLib | null = null

function resizeCanvas() {
  const canvas = canvasEl.value
  if (!canvas) return
  const ratio = Math.max(window.devicePixelRatio || 1, 1)
  const rect = canvas.getBoundingClientRect()
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Preserve current drawing across resize
  const prev = pad && !pad.isEmpty() ? pad.toDataURL() : null

  canvas.width = rect.width * ratio
  canvas.height = rect.height * ratio
  ctx.scale(ratio, ratio)

  if (pad) {
    pad.clear()
    if (prev) void pad.fromDataURL(prev)
    else if (isDataUrl(model.value)) void pad.fromDataURL(model.value)
  }
}

function handleEnd() {
  if (!pad) return
  model.value = pad.isEmpty() ? null : pad.toDataURL('image/png')
}

function clearSignature() {
  pad?.clear()
  model.value = null
}

onMounted(() => {
  if (!canvasEl.value) return
  pad = new SignaturePadLib(canvasEl.value, {
    penColor: '#111',
    minWidth: 0.8,
    maxWidth: 2.2,
  })
  pad.addEventListener('endStroke', handleEnd)

  resizeCanvas()
  if (isDataUrl(model.value)) void pad.fromDataURL(model.value)

  window.addEventListener('resize', resizeCanvas)
})

onBeforeUnmount(() => {
  pad?.off()
  pad = null
  window.removeEventListener('resize', resizeCanvas)
})

// React to external v-model changes (e.g. form reset)
watch(model, (v) => {
  if (!pad) return
  if (!isDataUrl(v)) {
    pad.clear()
    return
  }
  if (pad.isEmpty() || pad.toDataURL('image/png') !== v) {
    void pad.fromDataURL(v)
  }
})
</script>

<template>
  <div class="relative w-full">
    <canvas
      ref="canvasEl"
      class="block w-full h-[100px] bg-[#fffdf5] border-b border-neutral-400 rounded-sm cursor-crosshair touch-none"
      aria-label="Handtekening"
    />
    <button
      type="button"
      class="absolute top-1 right-1 text-[10px] px-2 py-[2px] rounded-sm border border-neutral-300 bg-white/85 text-neutral-600 hover:bg-white hover:text-neutral-900"
      @click="clearSignature"
    >
      Wissen
    </button>
  </div>
</template>
