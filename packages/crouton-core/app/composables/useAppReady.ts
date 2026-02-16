/**
 * App Readiness Gate System
 *
 * Provides a generic way for any package to register a "gate" that must resolve
 * before the app is considered ready. Used to prevent FOUC by holding content
 * invisible until all async initialization (theme loading, auth, etc.) completes.
 *
 * @example
 * ```typescript
 * // In any package's composable or plugin:
 * const { registerGate, resolveGate } = useAppReady()
 * registerGate('team-theme')
 *
 * // ... do async work ...
 *
 * resolveGate('team-theme')
 * ```
 */
export function useAppReady() {
  const gates = useState<Record<string, boolean>>('crouton-app-gates', () => ({}))

  const isReady = computed(() => {
    const g = gates.value
    const keys = Object.keys(g)
    return keys.length === 0 || keys.every(k => g[k])
  })

  function registerGate(name: string) {
    if (!(name in gates.value)) {
      gates.value[name] = false
    }
  }

  function resolveGate(name: string) {
    gates.value[name] = true
  }

  return {
    gates: readonly(gates),
    isReady: readonly(isReady),
    registerGate,
    resolveGate
  }
}
