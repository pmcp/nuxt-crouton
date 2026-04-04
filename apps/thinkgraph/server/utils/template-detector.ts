/**
 * Auto-detect the appropriate node type from title + brief content.
 *
 * Uses the unified type system (idea/discover/architect/generate/compose/review/deploy/meta).
 * Keeps users from having to manually classify nodes.
 */

import { NODE_TYPE_STEPS, type ThinkgraphNodeType, type ThinkgraphStep } from '~~/layers/thinkgraph/collections/nodes/types'

/** Keywords that signal each type (checked against lowercased title + brief) */
const TYPE_SIGNALS: Array<{ type: ThinkgraphNodeType; keywords: RegExp }> = [
  // Meta — targets ThinkGraph/pipeline itself
  {
    type: 'meta',
    keywords: /\b(thinkgraph|pipeline|stage instruction|session-manager|\.claude\/|skill file|mcp.?tool|optimizer|meta node)\b/i,
  },
  // Deploy — involves CI/deploy/launch
  {
    type: 'deploy',
    keywords: /\b(deploy|ci\/cd|launch|preview|cloudflare pages|staging|production environment|github actions)\b/i,
  },
  // Generate — scaffold via crouton CLI
  {
    type: 'generate',
    keywords: /\b(scaffold|crouton|collection|crud|generate collection|crouton config)\b/i,
  },
  // Architect — design, plan, structure
  {
    type: 'architect',
    keywords: /\b(design|architecture|schema|data model|plan structure|system design|wireframe|blueprint|erd|entity relationship)\b/i,
  },
  // Discover — investigation, no code changes
  {
    type: 'discover',
    keywords: /\b(research|investigate|explore|compare|analyse|analyze|evaluate|study|audit|review options|spike|proof of concept|poc)\b/i,
  },
  // Compose — code work (most common, broadest match)
  {
    type: 'compose',
    keywords: /\b(fix|add|implement|create|build|update|refactor|remove|delete|migrate|change|modify|replace|move|rename|extract|split|merge|wire|hook|connect|integrate|setup|configure)\b/i,
  },
]

export interface DetectedTemplate {
  template: ThinkgraphNodeType
  steps: ThinkgraphStep[]
}

/**
 * Detect node type from content. Falls back to 'idea' if no signals match.
 */
export function detectTemplate(title: string, brief?: string): DetectedTemplate {
  const text = `${title} ${brief || ''}`.toLowerCase()

  for (const { type, keywords } of TYPE_SIGNALS) {
    if (keywords.test(text)) {
      return { template: type, steps: NODE_TYPE_STEPS[type] }
    }
  }

  // No actionable signals — it's an idea
  return { template: 'idea', steps: [] }
}
