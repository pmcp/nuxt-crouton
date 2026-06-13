import { reactive, computed } from 'vue'
import type { Ref } from 'vue'
import { useMagicKeys, useRafFn } from '@vueuse/core'

export interface UseThreeControlsOptions {
  /** Movement applied per animation frame while a key is held. Default 0.08. */
  speed?: number
  /** Starting position [x, y, z]. Default [0, 0.5, 0]. */
  start?: [number, number, number]
  /** Clamp x/z to ±bounds (keeps the object on a finite ground plane). */
  bounds?: number
  /** Toggle input handling on/off (e.g. pause the game). Default enabled. */
  enabled?: Ref<boolean> | boolean
}

/**
 * useThreeControls
 *
 * Keyboard movement for TresJS scenes — WASD + arrow keys. Integrates a
 * reactive position on every animation frame; bind the returned `position`
 * to a `<TresMesh :position="position">`.
 *
 * Client-only by nature (uses requestAnimationFrame + keyboard events); it is
 * a no-op during SSR, so use it inside a `<ClientOnly>` boundary.
 *
 * @example
 * ```ts
 * const { position } = useThreeControls({ speed: 0.1, bounds: 9 })
 * // template: <TresMesh :position="position"> … </TresMesh>
 * ```
 */
export function useThreeControls(options: UseThreeControlsOptions = {}) {
  const speed = options.speed ?? 0.08
  const [sx, sy, sz] = options.start ?? [0, 0.5, 0]
  const state = reactive({ x: sx, y: sy, z: sz })

  const keys = useMagicKeys()
  const w = keys['w']
  const a = keys['a']
  const s = keys['s']
  const d = keys['d']
  const up = keys['ArrowUp']
  const down = keys['ArrowDown']
  const left = keys['ArrowLeft']
  const right = keys['ArrowRight']

  const isEnabled = () => {
    const e = options.enabled
    if (e === undefined) return true
    return typeof e === 'boolean' ? e : !!e.value
  }

  const clamp = (v: number) =>
    options.bounds ? Math.max(-options.bounds, Math.min(options.bounds, v)) : v

  useRafFn(() => {
    if (!isEnabled()) return
    if (w?.value || up?.value) state.z = clamp(state.z - speed)
    if (s?.value || down?.value) state.z = clamp(state.z + speed)
    if (a?.value || left?.value) state.x = clamp(state.x - speed)
    if (d?.value || right?.value) state.x = clamp(state.x + speed)
  })

  /** Reactive [x, y, z] tuple for binding to a Tres object's `:position`. */
  const position = computed<[number, number, number]>(() => [state.x, state.y, state.z])

  return {
    /** Mutable position state ({ x, y, z }) — write to it to teleport/reset. */
    state,
    /** Reactive [x, y, z] tuple for `:position` bindings. */
    position,
    /** Raw VueUse magic-keys proxy for adding custom key handling. */
    keys,
  }
}
