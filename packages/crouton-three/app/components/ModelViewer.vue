<script setup lang="ts">
/**
 * CroutonThreeModelViewer
 *
 * Loads a glTF/.glb model and displays it with orbit controls and optional
 * auto-rotate. Renders a graceful placeholder when no `src` is provided.
 *
 * Client-only (WebGL): the canvas is wrapped in <ClientOnly>. The async model
 * load is wrapped in <Suspense> with a skeleton fallback.
 *
 * @example
 * ```vue
 * <CroutonThreeModelViewer src="/models/duck.glb" :height="500" background="#0b0b12" />
 * ```
 */
import { computed } from 'vue'
import { OrbitControls, GLTFModel } from '@tresjs/cientos'

interface Props {
  /** Model URL (.glb or .gltf) */
  src?: string
  /** Viewer height (number = px, or any CSS length) */
  height?: number | string
  /** Background: 'transparent' (default) or any CSS/hex color */
  background?: string
  /** Auto-rotate the camera around the model */
  autoRotate?: boolean
  /** Auto-rotate speed (degrees/sec-ish, OrbitControls units) */
  autoRotateSpeed?: number
  /** Camera position [x, y, z] */
  cameraPosition?: [number, number, number]
  /** Show a reference grid on the ground plane */
  grid?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  height: 400,
  background: 'transparent',
  autoRotate: true,
  autoRotateSpeed: 2,
  cameraPosition: () => [3, 3, 3],
  grid: false,
})

const resolvedHeight = computed(() => (typeof props.height === 'number' ? `${props.height}px` : props.height))
const isTransparent = computed(() => !props.background || props.background === 'transparent')
const clearColor = computed(() => (isTransparent.value ? undefined : props.background))
const hasModel = computed(() => !!props.src)
</script>

<template>
  <div class="crouton-three-viewer relative w-full overflow-hidden rounded-lg" :style="{ height: resolvedHeight }">
    <ClientOnly>
      <TresCanvas
        v-if="hasModel"
        :clear-color="clearColor"
        :alpha="isTransparent"
        :shadows="true"
        :window-size="false"
      >
        <TresPerspectiveCamera :position="cameraPosition" :fov="45" :look-at="[0, 0, 0]" />
        <OrbitControls
          :auto-rotate="autoRotate"
          :auto-rotate-speed="autoRotateSpeed"
          :enable-pan="false"
          enable-damping
        />
        <TresAmbientLight :intensity="1.4" />
        <TresDirectionalLight :position="[5, 5, 5]" :intensity="2.2" cast-shadow />
        <TresGridHelper v-if="grid" :args="[10, 10]" />
        <Suspense>
          <GLTFModel :path="src" />
        </Suspense>
      </TresCanvas>

      <div
        v-else
        class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted bg-muted/10"
      >
        <UIcon name="i-lucide-box" class="size-8 opacity-40" />
        <span class="text-sm">No model selected</span>
      </div>

      <template #fallback>
        <div class="absolute inset-0 flex items-center justify-center bg-muted/10">
          <USkeleton class="h-full w-full" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
