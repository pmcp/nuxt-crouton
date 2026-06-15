import type { ThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/types'

/**
 * Path-type-aware context generator for the nodes model.
 * Wraps useNodeContext with prompt templates per path type.
 */
export function useNodeContextGenerator(nodes: Ref<ThinkgraphNode[]> | ComputedRef<ThinkgraphNode[]>) {
  const { buildContext, getChildren, getSiblings } = useNodeContext(nodes)
  const { copy } = useClipboard()

  const TASK_TEMPLATES: Record<string, (title: string) => string> = {
    diverge: t => `Generate 5-10 different approaches to: ${t}\n\nExplore varied angles — don't converge yet.`,
    deep_dive: t => `Go deep on: ${t}\n\nExplore implications, edge cases, trade-offs. What are we missing?`,
    prototype: t => `Create a working prototype plan for: ${t}\n\nBe specific, practical, and actionable.`,
    converge: t => `Synthesize these insights into a unified approach.\n\nContext: ${t}`,
    validate: t => `Challenge and stress-test: ${t}\n\nFind holes, risks, and unstated assumptions.`,
  }

  /**
   * Generate a full prompt for a given node and path type.
   * Combines the node's context chain with a path-type-specific task.
   */
  function generatePrompt(nodeId: string, pathType?: string): string {
    const node = nodes.value.find(n => n.id === nodeId)
    if (!node) return ''

    const payload = buildContext(nodeId)
    const effectivePathType = pathType || 'diverge'
    const sections: string[] = []

    // Preamble
    sections.push('You are continuing a structured thinking exploration.')

    // Context chain
    if (payload.markdown) {
      sections.push(payload.markdown)
    }

    // Sibling context (what's been explored at this level)
    const siblings = getSiblings(nodeId)
    if (siblings.length > 0) {
      const siblingLines = siblings.map(s => `- ${s.title} (${s.status})`).join('\n')
      sections.push(`## Sibling nodes (already explored at this level)\n${siblingLines}`)
    }

    // Children context (what's been explored below)
    const children = getChildren(nodeId)
    if (children.length > 0) {
      const childLines = children.map(c => `- ${c.title} (${c.status})`).join('\n')
      sections.push(`## Children (existing exploration below)\n${childLines}`)
    }

    // Task
    const taskFn = TASK_TEMPLATES[effectivePathType] || TASK_TEMPLATES.diverge
    sections.push(`## Task\n${taskFn(node.title)}`)

    // Output format
    sections.push(`## Output format\nWhen you reach a key insight or decision, format it as:\nDECISION: {"content": "your insight", "nodeType": "insight"}`)

    return sections.join('\n\n')
  }

  /** Generate and copy prompt to clipboard */
  async function copyPrompt(nodeId: string, pathType?: string): Promise<void> {
    const prompt = generatePrompt(nodeId, pathType)
    await copy(prompt)
  }

  /** Generate and copy raw context (no task template) to clipboard */
  async function copyContext(nodeId: string): Promise<void> {
    const payload = buildContext(nodeId)
    await copy(payload.markdown)
  }

  return {
    generatePrompt,
    copyPrompt,
    copyContext,
    buildContext,
  }
}
