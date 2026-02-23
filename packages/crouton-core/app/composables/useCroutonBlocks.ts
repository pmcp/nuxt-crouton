import type { CroutonBlockDefinition } from '../types/block-definition'

/**
 * Composable for accessing addon block definitions registered via app.config.ts.
 *
 * Addon packages register their blocks in `croutonBlocks` in app.config.ts.
 * Nuxt deep-merges all layer configs, so crouton-pages can discover all
 * addon blocks at runtime without hard dependencies.
 *
 * @example
 * ```typescript
 * const { blocks, blocksList, getBlock, hasBlock } = useCroutonBlocks()
 *
 * // Check if chart blocks are available
 * if (hasBlock('chartBlock')) { ... }
 *
 * // Get block definition for dynamic extension creation
 * const chartDef = getBlock('chartBlock')
 * ```
 */
export function useCroutonBlocks() {
  const appConfig = useAppConfig()

  const blocks = computed<Record<string, CroutonBlockDefinition>>(() => {
    return (appConfig.croutonBlocks || {}) as Record<string, CroutonBlockDefinition>
  })

  const blocksList = computed<CroutonBlockDefinition[]>(() => {
    return Object.values(blocks.value)
  })

  function getBlock(type: string): CroutonBlockDefinition | undefined {
    return blocks.value[type]
  }

  function hasBlock(type: string): boolean {
    return type in blocks.value
  }

  return {
    blocks,
    blocksList,
    getBlock,
    hasBlock
  }
}