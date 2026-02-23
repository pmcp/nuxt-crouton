import { computed } from 'vue'
import { blocks } from '../data/blocks'
import type { Block, BlockCategory, Visibility } from '../types/blocks'

/**
 * Read-only block lookup and filtering.
 * Static data in Phase A — will migrate to manifest discovery in Phase B.
 */
export function useBlockRegistry() {
  const allBlocks = computed(() => blocks)

  function getBlock(id: string): Block | undefined {
    return blocks.find(b => b.id === id)
  }

  const byCategory = computed(() => {
    const map = new Map<BlockCategory, Block[]>()
    for (const block of blocks) {
      const list = map.get(block.category) ?? []
      list.push(block)
      map.set(block.category, list)
    }
    return map
  })

  const byPackage = computed(() => {
    const map = new Map<string, Block[]>()
    for (const block of blocks) {
      const list = map.get(block.package) ?? []
      list.push(block)
      map.set(block.package, list)
    }
    return map
  })

  const byVisibility = computed(() => {
    const map = new Map<Visibility, Block[]>()
    for (const block of blocks) {
      const list = map.get(block.visibility) ?? []
      list.push(block)
      map.set(block.visibility, list)
    }
    return map
  })

  const categories = computed<BlockCategory[]>(() =>
    [...new Set(blocks.map(b => b.category))]
  )

  return {
    blocks: allBlocks,
    getBlock,
    byCategory,
    byPackage,
    byVisibility,
    categories
  }
}
