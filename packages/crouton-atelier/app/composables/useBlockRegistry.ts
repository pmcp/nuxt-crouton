import { blocks } from '../data/blocks'
import type { Block, BlockCategory, Visibility } from '../types/blocks'

/**
 * All available blocks.
 * Static data in Phase A — will migrate to manifest discovery in Phase B.
 */
export const allBlocks: readonly Block[] = blocks

/**
 * Look up a block by ID.
 */
export function getBlock(id: string): Block | undefined {
  return blocks.find(b => b.id === id)
}

/**
 * Blocks grouped by category.
 */
export const blocksByCategory: ReadonlyMap<BlockCategory, Block[]> = (() => {
  const map = new Map<BlockCategory, Block[]>()
  for (const block of blocks) {
    const list = map.get(block.category) ?? []
    list.push(block)
    map.set(block.category, list)
  }
  return map
})()

/**
 * Blocks grouped by package.
 */
export const blocksByPackage: ReadonlyMap<string, Block[]> = (() => {
  const map = new Map<string, Block[]>()
  for (const block of blocks) {
    const list = map.get(block.package) ?? []
    list.push(block)
    map.set(block.package, list)
  }
  return map
})()

/**
 * Blocks grouped by visibility.
 */
export const blocksByVisibility: ReadonlyMap<Visibility, Block[]> = (() => {
  const map = new Map<Visibility, Block[]>()
  for (const block of blocks) {
    const list = map.get(block.visibility) ?? []
    list.push(block)
    map.set(block.visibility, list)
  }
  return map
})()

/**
 * All unique block categories.
 */
export const blockCategories: readonly BlockCategory[] = [...new Set(blocks.map(b => b.category))]
