<script setup lang="ts">
/**
 * CroutonThreeStarterScene
 *
 * A runnable starting point for building a game: a WASD / arrow-key
 * controllable cube on a ground plane, lit and shadowed, with orbit controls
 * for the camera. Movement is driven by the `useThreeControls` composable —
 * copy this component into your app and grow it into a real game.
 *
 * @example
 * ```vue
 * <CroutonThreeStarterScene :height="600" />
 * ```
 */
import { computed } from 'vue'
import { OrbitControls } from '@tresjs/cientos'

interface Props {
  /** Scene height (number = px, or any CSS length) */
  height?: number | string
  /** Movement speed per frame */
  speed?: number
}

const props = withDefaults(defineProps<Props>(), {
  height: 480,
  speed: 0.08,
})

const resolvedHeight = computed(() => (typeof props.height === 'number' ? `${props.height}px` : props.height))

// Auto-imported from app/composables — WASD / arrow keys drive `position`.
const { position } = useThreeControls({ speed: props.speed, start: [0, 0.5, 0], bounds: 9 })
</script>

<template>
  <div class="crouton-three-starter relative w-full overflow-hidden rounded-lg" :style="{ height: resolvedHeight }">
    <ClientOnly>
      <TresCanvas clear-color="#0b0b12" :shadows="true" :window-size="false">
        <TresPerspectiveCamera :position="[6, 6, 6]" :fov="45" :look-at="[0, 0, 0]" />
        <OrbitControls enable-damping :max-polar-angle="1.4" />

        <TresAmbientLight :intensity="0.8" />
        <TresDirectionalLight :position="[6, 10, 6]" :intensity="2.5" cast-shadow />

        <!-- Player — bound to the reactive position from useThreeControls -->
        <TresMesh :position="position" cast-shadow>
          <TresBoxGeometry :args="[1, 1, 1]" />
          <TresMeshStandardMaterial color="#22d3ee" />
        </TresMesh>

        <!-- Ground -->
        <TresMesh :rotation="[-Math.PI / 2, 0, 0]" :position="[0, 0, 0]" receive-shadow>
          <TresPlaneGeometry :args="[20, 20]" />
          <TresMeshStandardMaterial color="#1e1b4b" />
        </TresMesh>

        <TresGridHelper :args="[20, 20]" />
      </TresCanvas>

      <template #fallback>
        <div class="absolute inset-0 flex items-center justify-center bg-muted/10">
          <USkeleton class="h-full w-full" />
        </div>
      </template>
    </ClientOnly>

    <div
      class="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white/70 pointer-events-none"
    >
      WASD / arrow keys to move
    </div>
  </div>
</template>
