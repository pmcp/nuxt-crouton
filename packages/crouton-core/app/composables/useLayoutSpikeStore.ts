import { ref, readonly } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { LayoutTree } from '../types/layout'

/**
 * Persistence for the layout spike (#713) — load/save a layout tree to the
 * team-scoped `layout_configs` table via REST. Throwaway; the production store
 * lands in Sprint 3 (#706).
 */
export function useLayoutSpikeStore() {
  const { getTeamId } = useTeamContext()
  const saving = ref(false)
  const error = ref<Error | null>(null)

  async function load(layoutId: string): Promise<LayoutTree | null> {
    const teamId = getTeamId()
    if (!teamId) return null
    try {
      const row = await $fetch<{ tree?: LayoutTree } | null>(
        `/api/teams/${teamId}/crouton-layouts/${layoutId}`,
        { credentials: 'include' },
      )
      return row?.tree ?? null
    }
    catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to load layout')
      return null
    }
  }

  const save = useDebounceFn(async (layoutId: string, tree: LayoutTree) => {
    const teamId = getTeamId()
    if (!teamId) return
    saving.value = true
    error.value = null
    try {
      await $fetch(`/api/teams/${teamId}/crouton-layouts/${layoutId}`, {
        method: 'PUT',
        body: { tree },
        credentials: 'include',
      })
    }
    catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to save layout')
    }
    finally {
      saving.value = false
    }
  }, 600)

  return { load, save, saving: readonly(saving), error: readonly(error) }
}
