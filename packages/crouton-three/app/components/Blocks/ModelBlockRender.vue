<script setup lang="ts">
/**
 * 3D Model Block Public Renderer
 *
 * Renders a model block in read-only mode using CroutonThreeModelViewer.
 * Since this lives in crouton-three, no hasApp() check is needed.
 *
 * NOTE: This component must NOT use top-level await (no async setup) — the
 * async model load happens inside CroutonThreeModelViewer's <Suspense>.
 */
import { computed } from 'vue'

interface ModelBlockAttrs {
  src?: string
  title?: string
  background?: string
  autoRotate?: boolean | string
  height?: number | string
}

interface Props {
  attrs: ModelBlockAttrs
}

const props = defineProps<Props>()

// Map the friendly background choice to a renderer clear-color.
const backgroundMap: Record<string, string> = {
  transparent: 'transparent',
  dark: '#0b0b12',
  light: '#f4f4f5'
}
const background = computed(() => backgroundMap[props.attrs.background || 'transparent'] || 'transparent')

// Height/autoRotate may arrive as strings from the select/switch schema.
const height = computed(() => {
  const h = props.attrs.height
  return typeof h === 'number' ? h : parseInt(String(h), 10) || 400
})

const autoRotate = computed(() => {
  const v = props.attrs.autoRotate
  if (typeof v === 'boolean') return v
  if (v === undefined) return true
  return v === 'true'
})

const hasModel = computed(() => !!props.attrs.src)
</script>

<template>
  <div class="model-block">
    <!-- No model set -->
    <UAlert
      v-if="!hasModel"
      color="neutral"
      icon="i-lucide-box"
      title="No 3D model set"
      description="Edit this block to choose a .glb/.gltf model or paste a model URL."
    />

    <!-- Render model -->
    <figure
      v-else
      class="space-y-2"
    >
      <CroutonThreeModelViewer
        :src="attrs.src"
        :height="height"
        :background="background"
        :auto-rotate="autoRotate"
      />
      <figcaption
        v-if="attrs.title"
        class="text-center text-sm text-muted"
      >
        {{ attrs.title }}
      </figcaption>
    </figure>
  </div>
</template>
