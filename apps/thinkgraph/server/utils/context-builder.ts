/**
 * Shared context builder for ThinkGraph AI features.
 * Extracted from expand.post.ts — used by expand, chat, brief, and dispatch endpoints.
 */

/** Rough token estimate: ~4 chars per token */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/** Max tokens reserved for assembled context (leaves room for system prompt + response) */
const MAX_CONTEXT_TOKENS = 12000

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
  const sections: string[] = []
  let usedTokens = 0
  const instructionLine = `Generate ${count} new perspectives. Be different from existing children and siblings.\n`
  const instructionTokens = estimateTokens(instructionLine)
  const budget = MAX_CONTEXT_TOKENS - instructionTokens

  // Priority 1: Current node + ancestors (50% budget max)
  const ancestorBudget = Math.floor(budget * 0.5)
  let ancestorSection = ''

  if (ancestors.length > 0) {
    const hasBriefs = ancestors.some(a => a.brief)
    if (hasBriefs) {
      ancestorSection += 'Context chain:\n'
      ancestors.forEach((a, i) => {
        const label = `${nodeTypeLabel(a.nodeType)}: ${a.content.slice(0, 80)}`
        if (a.brief) {
          ancestorSection += `${'  '.repeat(i)}→ ${label}\n`
          ancestorSection += `${'  '.repeat(i + 1)}Brief: ${a.brief.slice(0, 200)}\n`
        } else {
          ancestorSection += `${'  '.repeat(i)}→ ${label}\n`
        }
      })
      ancestorSection += `${'  '.repeat(ancestors.length)}→ [CURRENT] ${target.content}\n\n`
    } else {
      ancestorSection += 'Thinking chain so far:\n'
      // If ancestors exceed budget, keep direct parent + truncation note
      let ancestorList = ancestors
      if (estimateTokens(ancestors.map(a => a.content).join('')) > ancestorBudget && ancestors.length > 1) {
        const omitted = ancestors.length - 1
        ancestorSection += `[Context truncated - ${omitted} earlier ancestor${omitted > 1 ? 's' : ''} omitted]\n`
        ancestorList = ancestors.slice(-1) // just the direct parent
      }
      ancestorList.forEach((a, i) => {
        ancestorSection += `${'  '.repeat(i)}→ ${a.content} (${a.nodeType})\n`
      })
      ancestorSection += `${'  '.repeat(ancestorList.length)}→ [CURRENT] ${target.content}\n\n`
    }
  } else {
    ancestorSection += `Starting thought: ${target.content}\n\n`
  }

  sections.push(ancestorSection)
  usedTokens += estimateTokens(ancestorSection)

  // Priority 2: Children (dedup context)
  if (children.length > 0 && usedTokens < budget) {
    let section = 'Existing children (avoid duplicating these):\n'
    children.forEach(c => {
      section += `- ${c.content} (${c.nodeType})\n`
    })
    section += '\n'
    if (usedTokens + estimateTokens(section) <= budget) {
      sections.push(section)
      usedTokens += estimateTokens(section)
    }
  }

  // Priority 3: Siblings
  if (siblings.length > 0 && usedTokens < budget) {
    let section = 'Sibling perspectives:\n'
    siblings.forEach(s => {
      section += `- ${s.content} (${s.nodeType})\n`
    })
    section += '\n'
    if (usedTokens + estimateTokens(section) <= budget) {
      sections.push(section)
      usedTokens += estimateTokens(section)
    }
  }

  // Priority 4: Pinned
  if (pinned && pinned.length > 0 && usedTokens < budget) {
    let section = 'Pinned context (always active):\n'
    pinned.slice(0, 5).forEach(p => {
      section += `📌 ${p.content}\n`
    })
    section += '\n'
    if (usedTokens + estimateTokens(section) <= budget) {
      sections.push(section)
      usedTokens += estimateTokens(section)
    }
  }

  // Priority 5: Starred
  if (starred.length > 0 && usedTokens < budget) {
    let section = 'Starred insights from other branches:\n'
    starred.slice(0, 5).forEach(s => {
      section += `⭐ ${s.content}\n`
    })
    section += '\n'
    if (usedTokens + estimateTokens(section) <= budget) {
      sections.push(section)
      usedTokens += estimateTokens(section)
    }
  }

  sections.push(instructionLine)
  return sections.join('')
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

/** Placeholder for artifact summary — returns empty string if no artifacts */
function summarizeArtifacts(_node: ContextNode): string {
  return ''
}

// ─── Progressive context disclosure (3-layer system) ───

export interface NodeContextPayload {
  nodeId: string
  chain: NodeContextEntry[]
  tokenEstimate: number
  markdown: string
}

export interface NodeContextEntry {
  id: string
  title: string
  nodeType: string
  status: string
  /** Index layer: ~50 token AI-generated summary */
  summary?: string
  /** Expanded layer: full brief + output */
  brief?: string
  output?: string
  /** Which layer was used for this entry */
  layer: 'index' | 'expanded' | 'full'
}

/** Input node shape accepted by buildNodeContext */
export type ContextInputNode = {
  id: string
  parentId?: string
  title: string
  nodeType: string
  status: string
  summary?: string
  brief?: string
  output?: string
  pinned?: boolean
  contextScope?: string
  contextNodeIds?: Record<string, unknown> | string[] | null
}

/**
 * Build context payload with progressive disclosure.
 *
 * 3-layer system:
 * - Index (~50 tokens): summary one-liner. Used for connected/ancestor nodes.
 * - Expanded (~500 tokens): full brief + output. Fetched via expand_node tool.
 * - Full (~2000+ tokens): step history, artifacts. On-demand only.
 *
 * Budget allocation (~12K tokens max):
 * - Current node: always full
 * - Pinned nodes: always full
 * - First ancestor (project brief / root): always full
 * - Other ancestors: index layer (summary or title fallback)
 * - Manual context nodes: index layer
 *
 * Backwards-compatible: nodes without summaries fall back to truncated title.
 */
export function buildNodeContext(
  allNodes: ContextInputNode[],
  targetId: string,
): NodeContextPayload {
  const nodeMap = new Map(allNodes.map(n => [n.id, n]))
  const target = nodeMap.get(targetId)

  if (!target) {
    return { nodeId: targetId, chain: [], tokenEstimate: 0, markdown: '' }
  }

  const scope = target.contextScope || 'branch'
  let contextNodes: ContextInputNode[]

  if (scope === 'manual' && target.contextNodeIds) {
    const ids = Array.isArray(target.contextNodeIds)
      ? target.contextNodeIds as string[]
      : Object.keys(target.contextNodeIds)
    contextNodes = ids.map(id => nodeMap.get(id)).filter((n): n is NonNullable<typeof n> => !!n)
  }
  else {
    // Walk ancestor chain (root first)
    const chain: ContextInputNode[] = []
    let current: ContextInputNode | undefined = target
    while (current) {
      chain.unshift(current)
      current = current.parentId ? nodeMap.get(current.parentId) : undefined
    }
    contextNodes = chain
  }

  // Collect pinned nodes not already in the chain
  const chainIds = new Set(contextNodes.map(n => n.id))
  const pinnedNodes = allNodes.filter(n => n.pinned && !chainIds.has(n.id))

  // Build entries with layer assignment
  const chain: NodeContextEntry[] = []
  let usedTokens = 0

  // First ancestor (root / project brief) — full layer
  if (contextNodes.length > 0 && contextNodes[0].id !== targetId) {
    const root = contextNodes[0]
    const entry = buildFullEntry(root)
    usedTokens += estimateEntryTokens(entry)
    chain.push(entry)
  }

  // Middle ancestors — index layer (summary or title fallback)
  for (let i = 1; i < contextNodes.length - 1; i++) {
    const node = contextNodes[i]
    if (node.id === targetId) continue
    const entry = buildIndexEntry(node)
    usedTokens += estimateEntryTokens(entry)
    if (usedTokens > MAX_CONTEXT_TOKENS) break
    chain.push(entry)
  }

  // Pinned nodes — full layer
  for (const pinned of pinnedNodes) {
    const entry = buildFullEntry(pinned)
    const entryTokens = estimateEntryTokens(entry)
    if (usedTokens + entryTokens > MAX_CONTEXT_TOKENS) break
    usedTokens += entryTokens
    chain.push({ ...entry, title: `📌 ${entry.title}` })
  }

  // Current node — always full
  if (target) {
    const entry = buildFullEntry(target)
    usedTokens += estimateEntryTokens(entry)
    chain.push(entry)
  }

  const markdown = formatProgressiveContextMarkdown(chain, targetId)
  const tokenEstimate = estimateTokens(markdown)

  return { nodeId: targetId, chain, tokenEstimate, markdown }
}

/** Build an index-layer entry (~50 tokens): summary or title fallback */
function buildIndexEntry(node: ContextInputNode): NodeContextEntry {
  return {
    id: node.id,
    title: node.title,
    nodeType: node.nodeType,
    status: node.status,
    summary: node.summary || undefined,
    layer: 'index',
  }
}

/** Build a full-layer entry: all content included */
function buildFullEntry(node: ContextInputNode): NodeContextEntry {
  return {
    id: node.id,
    title: node.title,
    nodeType: node.nodeType,
    status: node.status,
    summary: node.summary || undefined,
    brief: node.brief || undefined,
    output: node.output || undefined,
    layer: 'full',
  }
}

/** Estimate tokens for a single context entry */
function estimateEntryTokens(entry: NodeContextEntry): number {
  const content = entry.layer === 'index'
    ? (entry.summary || entry.title)
    : (entry.output || entry.brief || entry.title)
  return estimateTokens(`${entry.title}\n${content}`)
}

/**
 * Build an expanded-layer payload for a specific node.
 * Used by the expand_node MCP tool when an agent needs more than index-level detail.
 */
export function buildExpandedNodeContext(
  node: ContextInputNode,
): { id: string; title: string; brief?: string; output?: string; tokenEstimate: number } {
  const brief = node.brief || undefined
  const output = node.output || undefined
  const content = [node.title, brief, output].filter(Boolean).join('\n')
  return {
    id: node.id,
    title: node.title,
    brief,
    output,
    tokenEstimate: estimateTokens(content),
  }
}

function formatProgressiveContextMarkdown(chain: NodeContextEntry[], targetId: string): string {
  if (chain.length === 0) return ''

  const lines = chain.map((entry, i) => {
    const isCurrent = entry.id === targetId
    const prefix = isCurrent ? '→ [CURRENT]' : `${i + 1}.`
    const meta = [nodeTypeLabel(entry.nodeType), entry.status !== 'idle' ? entry.status : ''].filter(Boolean).join(', ')
    const header = `${prefix} **${entry.title}**${meta ? ` (${meta})` : ''}`

    if (entry.layer === 'index') {
      // Index layer: summary one-liner or title only
      const summary = entry.summary || entry.title
      return `${header}\n   ${summary}`
    }

    // Full layer: include all content
    const content = entry.output || entry.brief || entry.title
    return `${header}\n   ${content}`
  })

  return `## Context chain\n\n${lines.join('\n\n')}`
}
