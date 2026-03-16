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
  // New execution canvas fields
  status?: string
  origin?: string
  brief?: string
  contextScope?: string
  notionId?: string
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

/**
 * Build context from ancestor briefs instead of raw content.
 * This is the execution canvas context model — briefs are the context payload,
 * not raw session output. Token usage stays bounded regardless of tree depth.
 */
export function buildBriefChain(allDecisions: ContextNode[], targetId: string): string {
  const ancestors = buildAncestorChain(allDecisions, targetId)
  const target = allDecisions.find(d => d.id === targetId)

  if (ancestors.length === 0 && !target) return ''

  let context = 'Context chain (briefs):\n\n'

  for (const ancestor of ancestors) {
    const brief = ancestor.brief
    if (brief) {
      context += `## ${ancestor.nodeType.toUpperCase()}: ${ancestor.content.slice(0, 80)}\n`
      context += `${brief}\n\n`
    } else {
      // Fallback to content if no brief exists yet
      context += `## ${ancestor.nodeType.toUpperCase()}: ${ancestor.content}\n\n`
    }
  }

  if (target) {
    context += `## [CURRENT] ${target.nodeType.toUpperCase()}: ${target.content}\n`
    if (target.brief) {
      context += `${target.brief}\n`
    }
  }

  return context
}

/**
 * Human-readable label for node types (used in prompts and context).
 */
export function nodeTypeLabel(nodeType: string): string {
  const labels: Record<string, string> = {
    idea: 'Idea',
    insight: 'Insight',
    decision: 'Decision',
    question: 'Question',
    epic: 'Epic',
    user_story: 'User Story',
    task: 'Task',
    milestone: 'Milestone',
    remark: 'Remark',
    fork: 'Fork',
    send: 'Send',
  }
  return labels[nodeType] || nodeType
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
    // Use briefs when available for bounded context
    const hasBriefs = ancestors.some(a => a.brief)
    if (hasBriefs) {
      prompt += 'Context chain:\n'
      ancestors.forEach((a, i) => {
        const label = `${nodeTypeLabel(a.nodeType)}: ${a.content.slice(0, 80)}`
        if (a.brief) {
          prompt += `${'  '.repeat(i)}→ ${label}\n`
          prompt += `${'  '.repeat(i + 1)}Brief: ${a.brief.slice(0, 200)}\n`
        } else {
          prompt += `${'  '.repeat(i)}→ ${label}\n`
        }
      })
      prompt += `${'  '.repeat(ancestors.length)}→ [CURRENT] ${target.content}\n\n`
    } else {
      prompt += 'Thinking chain so far:\n'
      ancestors.forEach((a, i) => {
        prompt += `${'  '.repeat(i)}→ ${a.content} (${a.nodeType})\n`
      })
      prompt += `${'  '.repeat(ancestors.length)}→ [CURRENT] ${target.content}\n\n`
    }
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
 * Build context from explicitly selected nodes (multi-branch context).
 * Merges the target's ancestor chain with user-selected nodes from other branches.
 */
export function buildSelectedBranchContext(
  target: ContextNode,
  selectedContextNodes: ContextNode[],
  ancestors: ContextNode[],
  allDecisions: ContextNode[]
): string {
  let prompt = ''

  if (ancestors.length > 0) {
    prompt += 'Thinking path to current node:\n'
    ancestors.forEach((a, i) => {
      prompt += `${'  '.repeat(i)}→ ${a.content} (${a.nodeType})\n`
    })
    prompt += `${'  '.repeat(ancestors.length)}→ [CURRENT] ${target.content}\n\n`
  } else {
    prompt += `Current node: ${target.content} (${target.nodeType})\n\n`
  }

  if (selectedContextNodes.length > 0) {
    prompt += 'Selected context from other branches:\n\n'
    for (const node of selectedContextNodes) {
      const nodeAncestors = buildAncestorChain(allDecisions, node.id)
      prompt += `── ${node.nodeType.toUpperCase()}: ${node.content}\n`
      if (nodeAncestors.length > 0) {
        prompt += `   Path: ${nodeAncestors.map(a => a.content.slice(0, 50)).join(' → ')}\n`
      }
      prompt += '\n'
    }
  }

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
