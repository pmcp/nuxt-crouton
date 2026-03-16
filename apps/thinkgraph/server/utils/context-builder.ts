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
  pinned?: boolean
  branchName?: string
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
  count: number,
  pinned?: ContextNode[]
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

  if (pinned && pinned.length > 0) {
    prompt += 'Pinned context (always active):\n'
    pinned.slice(0, 5).forEach(p => {
      prompt += `📌 ${p.content}\n`
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
export function buildDispatchContext(
  target: ContextNode,
  allDecisions: ContextNode[]
): string {
  const ancestors = buildAncestorChain(allDecisions, target.id)
  const ancestorIds = new Set(ancestors.map(a => a.id))
  const pinned = allDecisions.filter(d => d.pinned && d.id !== target.id && !ancestorIds.has(d.id))
  const starred = allDecisions.filter(d => d.starred && d.id !== target.id)

  let context = ''

  if (ancestors.length > 0) {
    context += 'Thinking path:\n'
    ancestors.forEach((a, i) => {
      context += `${'  '.repeat(i)}→ ${a.content}\n`
    })
    context += `${'  '.repeat(ancestors.length)}→ [CURRENT] ${target.content}\n\n`
  } else {
    context += `Current thought: ${target.content}\n\n`
  }

  if (pinned.length > 0) {
    context += 'Pinned context (always active):\n'
    pinned.slice(0, 5).forEach(p => {
      context += `- ${p.content}\n`
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
