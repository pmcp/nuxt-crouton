/**
 * Shared context builder for ThinkGraph AI features.
 * Extracted from expand.post.ts — used by expand, chat, brief, and dispatch endpoints.
 */

export interface ContextNode {
  id: string
  content: string
  nodeType: string
  pathType?: string
  parentId?: string
  starred?: boolean
  branchName?: string
  artifacts?: Array<{
    type: string
    content?: string
    url?: string
    provider?: string
    metadata?: Record<string, unknown>
  }>
}

export function buildAncestorChain(allDecisions: ContextNode[], targetId: string): ContextNode[] {
  const chain: ContextNode[] = []
  let current = allDecisions.find(d => d.id === targetId)
  while (current?.parentId) {
    const parent = allDecisions.find(d => d.id === current!.parentId)
    if (!parent) break
    chain.unshift(parent)
    current = parent
  }
  return chain
}

export function buildPrompt(
  target: ContextNode,
  ancestors: ContextNode[],
  siblings: ContextNode[],
  children: ContextNode[],
  starred: ContextNode[],
  count: number
): string {
  let prompt = ''

  if (ancestors.length > 0) {
    prompt += 'Thinking chain so far:\n'
    ancestors.forEach((a, i) => {
      prompt += `${'  '.repeat(i)}→ ${a.content} (${a.nodeType})\n`
    })
    prompt += `${'  '.repeat(ancestors.length)}→ [CURRENT] ${target.content}\n\n`
  } else {
    prompt += `Starting thought: ${target.content}\n\n`
  }

  if (children.length > 0) {
    prompt += 'Existing children (avoid duplicating these):\n'
    children.forEach(c => {
      prompt += `- ${c.content} (${c.nodeType})\n`
    })
    prompt += '\n'
  }

  if (siblings.length > 0) {
    prompt += 'Sibling perspectives:\n'
    siblings.forEach(s => {
      prompt += `- ${s.content} (${s.nodeType})\n`
    })
    prompt += '\n'
  }

  if (starred.length > 0) {
    prompt += 'Starred insights from other branches:\n'
    starred.slice(0, 5).forEach(s => {
      prompt += `⭐ ${s.content}\n`
    })
    prompt += '\n'
  }

  prompt += `Generate ${count} new perspectives. Be different from existing children and siblings.\n`

  return prompt
}

/**
 * Build a context string for dispatch services.
 * Includes the full thinking chain and starred insights for maximum context.
 */
/**
 * Summarize artifacts for context (truncated to avoid blowing up the prompt).
 */
function summarizeArtifacts(node: ContextNode): string {
  if (!node.artifacts?.length) return ''
  const lines: string[] = []
  for (const a of node.artifacts) {
    if (a.type === 'code' && a.content) {
      const lang = (a.metadata?.language as string) || 'code'
      lines.push(`   [${a.type}/${lang}]: ${a.content.slice(0, 500)}`)
    } else if (a.type === 'prototype' && a.content) {
      lines.push(`   [prototype HTML]: ${a.content.slice(0, 800)}`)
    } else if (a.type === 'text' && a.content) {
      lines.push(`   [text]: ${a.content.slice(0, 500)}`)
    } else if (a.type === 'image' && a.url) {
      lines.push(`   [image from ${a.provider || 'unknown'}]`)
    }
  }
  return lines.length > 0 ? '\n' + lines.join('\n') : ''
}

/**
 * Build a context string for dispatch services.
 * Includes the full thinking chain, artifact content, and starred insights.
 */
export function buildDispatchContext(
  target: ContextNode,
  allDecisions: ContextNode[]
): string {
  const ancestors = buildAncestorChain(allDecisions, target.id)
  const starred = allDecisions.filter(d => d.starred && d.id !== target.id)

  let context = ''

  if (ancestors.length > 0) {
    context += 'Thinking path:\n'
    ancestors.forEach((a, i) => {
      context += `${'  '.repeat(i)}→ ${a.content} (${a.nodeType})${summarizeArtifacts(a)}\n`
    })
    context += `${'  '.repeat(ancestors.length)}→ [CURRENT] ${target.content}${summarizeArtifacts(target)}\n\n`
  } else {
    context += `Current thought: ${target.content}${summarizeArtifacts(target)}\n\n`
  }

  // Include children context so AI knows what already exists
  const children = allDecisions.filter(d => d.parentId === target.id)
  if (children.length > 0) {
    context += 'Existing children of this node:\n'
    children.forEach(c => {
      context += `- ${c.content} (${c.nodeType})${summarizeArtifacts(c)}\n`
    })
    context += '\n'
  }

  if (starred.length > 0) {
    context += 'Key insights:\n'
    starred.slice(0, 5).forEach(s => {
      context += `- ${s.content}\n`
    })
    context += '\n'
  }

  return context
}

/**
 * Build a combined context from multiple selected nodes.
 * Shows each node with its thinking path for rich multi-perspective context.
 */
export function buildMultiNodeContext(
  targets: ContextNode[],
  allDecisions: ContextNode[]
): { combinedContext: string; combinedContent: string } {
  const starred = allDecisions.filter(d => d.starred && !targets.some(t => t.id === d.id))

  let context = `Selected ${targets.length} nodes to combine:\n\n`

  for (const target of targets) {
    const ancestors = buildAncestorChain(allDecisions, target.id)
    context += `── ${target.nodeType.toUpperCase()}: ${target.content}${summarizeArtifacts(target)}\n`
    if (ancestors.length > 0) {
      context += `   Path: ${ancestors.map(a => a.content.slice(0, 50)).join(' → ')}\n`
    }
    context += '\n'
  }

  if (starred.length > 0) {
    context += 'Key insights from graph:\n'
    starred.slice(0, 5).forEach(s => {
      context += `- ${s.content}\n`
    })
    context += '\n'
  }

  const combinedContent = targets.map(t => t.content).join('; ')

  return { combinedContext: context, combinedContent }
}
