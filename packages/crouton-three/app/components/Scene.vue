<script setup lang="ts">
/**
 * CroutonThreeScene
 *
 * A ready-to-use TresJS canvas: perspective camera, ambient + directional
 * lighting, optional orbit controls and grid. The default slot is rendered
 * INSIDE the canvas, so drop in any Tres catalogue content — meshes, models,
 * game objects — and build from there.
 *
 * Client-only (WebGL): the canvas is wrapped in <ClientOnly> so it is safe to
 * use on SSR-rendered pages.
 *
 * @example Build a scene / game
 * ```vue
 * <CroutonThreeScene :height="600" background="dark">
 *   <TresMesh :position="[0, 1, 0]">
 *     <TresBoxGeometry :args="[1, 1, 1]" />
 *     <TresMeshStandardMaterial color="orange" />
 *   </TresMesh>
 * </CroutonThreeScene>
 * ```
 *
 * Loading a model inside the slot is async, so wrap it in <Suspense>:
 * ```vue
 * <CroutonThreeScene>
 *   <Suspense><GLTFModel path="/models/ship.glb" /></Suspense>
 * </CroutonThreeScene>
 * ```
 */
import { computed } from 'vue'
import { OrbitControls } from '@tresjs/cientos'

interface Props {
  /** Canvas height (number = px, or any CSS length) */
  height?: number | string
  /** Background: 'transparent' (default), or any CSS/hex color the renderer should clear to */
  background?: string
  /** Show orbit controls (drag to rotate, scroll to zoom) */
  controls?: boolean
  /** Auto-rotate the camera around the scene (requires controls) */
  autoRotate?: boolean
  /** Camera position [x, y, z] */
  cameraPosition?: [number, number, number]
  /** Ambient light intensity */
  ambientIntensity?: number
  /** Show a reference grid on the ground plane */
  grid?: boolean
  /** Enable shadow maps */
  shadows?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: 480,
  background: 'transparent',
  controls: true,
  autoRotate: false,
  cameraPosition: () => [5, 5, 5],
  ambientIntensity: 1,
  grid: false,
  shadows: true,
})

const resolvedHeight = computed(() => (typeof props.height === 'number' ? `${props.height}px` : props.height))
const isTransparent = computed(() => !props.background || props.background === 'transparent')
const clearColor = computed(() => (isTransparent.value ? undefined : props.background))
</script>

<template>
  <div class="crouton-three-scene relative w-full overflow-hidden rounded-lg" :style="{ height: resolvedHeight }">
    <ClientOnly>
      <TresCanvas
        :clear-color="clearColor"
        :alpha="isTransparent"
        :shadows="shadows"
        :window-size="false"
      >
        <TresPerspectiveCamera :position="cameraPosition" :fov="45" :look-at="[0, 0, 0]" />
        <OrbitControls v-if="controls" :auto-rotate="autoRotate" enable-damping />
        <TresAmbientLight :intensity="ambientIntensity" />
        <TresDirectionalLight :position="[5, 5, 5]" :intensity="2" cast-shadow />
        <TresGridHelper v-if="grid" :args="[20, 20]" />
        <slot />
      </TresCanvas>

      <template #fallback>
        <div class="absolute inset-0 flex items-center justify-center bg-muted/10">
          <USkeleton class="h-full w-full" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
