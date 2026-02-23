import { computed, watch, type Ref, type ComputedRef } from 'vue'
import type { AppComposition, AppIdentity, SelectedBlock, Visibility } from '../types/blocks'
import { blocks as allBlocks } from '../data/blocks'
import { templates } from '../data/templates'
import type * as Y from 'yjs'

const emptyComposition: AppComposition = {
  identity: { name: '', description: '', icon: '' },
  selectedBlocks: [],
  enabledPackages: []
}

function derivePackages(selectedBlocks: SelectedBlock[]): string[] {
  const pkgs = new Set<string>()
  for (const sb of selectedBlocks) {
    const block = allBlocks.find(b => b.id === sb.blockId)
    if (block) pkgs.add(block.package)
  }
  return [...pkgs]
}

/**
 * Reactive composition state backed by Yjs Y.Map.
 * All mutations sync to collaborators in real-time.
 */
export function useAppComposition(
  ymap: Y.Map<unknown> | null,
  data: Ref<Record<string, unknown>>
) {
  // ── Reactive composition derived from Yjs data ────────────────
  const composition: ComputedRef<AppComposition> = computed(() => {
    const raw = data.value
    const identity = (raw.identity as AppIdentity) ?? { ...emptyComposition.identity }
    const selectedBlocks = (raw.blocks as SelectedBlock[]) ?? []
    return {
      identity,
      selectedBlocks,
      enabledPackages: derivePackages(selectedBlocks)
    }
  })

  const enabledPackages = computed(() => composition.value.enabledPackages)

  const blocksByVisibility = computed(() => {
    const groups: Record<Visibility, SelectedBlock[]> = {
      public: [],
      auth: [],
      admin: []
    }
    for (const sb of composition.value.selectedBlocks) {
      groups[sb.visibility]?.push(sb)
    }
    // Sort each group by order
    for (const key of Object.keys(groups) as Visibility[]) {
      groups[key].sort((a, b) => a.order - b.order)
    }
    return groups
  })

  // ── Mutations (write to Y.Map → auto-sync to all clients) ────

  function _setBlocks(blocks: SelectedBlock[]) {
    if (!ymap) return
    ymap.doc!.transact(() => {
      ymap.set('blocks', blocks)
    })
  }

  function _getBlocks(): SelectedBlock[] {
    return (data.value.blocks as SelectedBlock[]) ?? []
  }

  function addBlock(blockId: string) {
    const existing = _getBlocks()
    if (existing.some(sb => sb.blockId === blockId)) return

    const blockDef = allBlocks.find(b => b.id === blockId)
    if (!blockDef) return

    const visibility = blockDef.visibility
    const sameVisibility = existing.filter(sb => sb.visibility === visibility)
    const newBlock: SelectedBlock = {
      blockId,
      visibility,
      order: sameVisibility.length
    }
    _setBlocks([...existing, newBlock])
  }

  function removeBlock(blockId: string) {
    const existing = _getBlocks()
    const filtered = existing.filter(sb => sb.blockId !== blockId)
    // Recompute order within each visibility group
    const reordered = recomputeOrders(filtered)
    _setBlocks(reordered)
  }

  function moveBlock(blockId: string, newVisibility: Visibility, newOrder: number) {
    const existing = _getBlocks()
    const updated = existing.map(sb =>
      sb.blockId === blockId
        ? { ...sb, visibility: newVisibility, order: newOrder }
        : sb
    )
    const reordered = recomputeOrders(updated)
    _setBlocks(reordered)
  }

  function reorderBlocks(visibility: Visibility, blockIds: string[]) {
    const existing = _getBlocks()
    const updated = existing.map((sb) => {
      if (sb.visibility !== visibility) return sb
      const idx = blockIds.indexOf(sb.blockId)
      return idx >= 0 ? { ...sb, order: idx } : sb
    })
    _setBlocks(updated)
  }

  function selectTemplate(templateId: string) {
    const template = templates.find(t => t.id === templateId)
    if (!template || !ymap) return

    ymap.doc!.transact(() => {
      // Set identity (only if template provides one)
      if (template.identity.name) {
        ymap.set('identity', {
          name: template.identity.name,
          description: template.identity.description,
          icon: ''
        })
      }

      // Set blocks from template
      const selectedBlocks: SelectedBlock[] = template.blocks.map((tb, index) => {
        const blockDef = allBlocks.find(b => b.id === tb.blockId)
        const visibility = tb.visibility ?? blockDef?.visibility ?? 'public'
        return {
          blockId: tb.blockId,
          visibility,
          order: index
        }
      })
      // Recompute proper per-visibility ordering
      ymap.set('blocks', recomputeOrders(selectedBlocks))
    })
  }

  function updateIdentity(partial: Partial<AppIdentity>) {
    if (!ymap) return
    const current = (data.value.identity as AppIdentity) ?? { name: '', description: '', icon: '' }
    ymap.set('identity', { ...current, ...partial })
  }

  function reset() {
    if (!ymap) return
    ymap.doc!.transact(() => {
      ymap.set('identity', { ...emptyComposition.identity })
      ymap.set('blocks', [])
    })
  }

  return {
    composition,
    addBlock,
    removeBlock,
    moveBlock,
    reorderBlocks,
    selectTemplate,
    updateIdentity,
    reset,
    enabledPackages,
    blocksByVisibility
  }
}

function recomputeOrders(blocks: SelectedBlock[]): SelectedBlock[] {
  const groups: Record<string, SelectedBlock[]> = {}
  for (const sb of blocks) {
    ;(groups[sb.visibility] ??= []).push(sb)
  }
  const result: SelectedBlock[] = []
  for (const group of Object.values(groups)) {
    group.sort((a, b) => a.order - b.order)
    group.forEach((sb, i) => result.push({ ...sb, order: i }))
  }
  return result
}
