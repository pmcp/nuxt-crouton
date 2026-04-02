/**
 * Auto-detect the appropriate node template from title + brief content.
 *
 * Keeps users from having to manually classify nodes.
 * Returns the template and its default steps.
 */

const TEMPLATE_STEPS: Record<string, string[]> = {
  idea: [],
  research: ['analyse'],
  task: ['analyst', 'builder', 'reviewer', 'merger'],
  feature: ['analyst', 'builder', 'launcher', 'reviewer', 'merger'],
  meta: ['analyst', 'builder', 'reviewer', 'merger'],
}

/** Keywords that signal each template (checked against lowercased title + brief) */
const TEMPLATE_SIGNALS: Array<{ template: string; keywords: RegExp }> = [
  // Meta — targets ThinkGraph/pipeline itself
  {
    template: 'meta',
    keywords: /\b(thinkgraph|pipeline|stage instruction|session-manager|\.claude\/|skill file|mcp.?tool|optimizer|meta node)\b/i,
  },
  // Feature — involves CI/deploy/launch
  {
    template: 'feature',
    keywords: /\b(deploy|ci\/cd|launch|preview|cloudflare pages|staging|production environment|github actions)\b/i,
  },
  // Research — investigation, no code changes
  {
    template: 'research',
    keywords: /\b(research|investigate|explore|compare|analyse|analyze|evaluate|study|audit|review options|spike|proof of concept|poc)\b/i,
  },
  // Task — code work (most common, broadest match)
  {
    template: 'task',
    keywords: /\b(fix|add|implement|create|build|update|refactor|remove|delete|migrate|change|modify|replace|move|rename|extract|split|merge|wire|hook|connect|integrate|setup|configure)\b/i,
  },
]

export interface DetectedTemplate {
  template: string
  steps: string[]
}

/**
 * Detect template from node content. Falls back to 'idea' if no signals match.
 */
export function detectTemplate(title: string, brief?: string): DetectedTemplate {
  const text = `${title} ${brief || ''}`.toLowerCase()

  for (const { template, keywords } of TEMPLATE_SIGNALS) {
    if (keywords.test(text)) {
      return { template, steps: TEMPLATE_STEPS[template] }
    }
  }

  // No actionable signals — it's an idea
  return { template: 'idea', steps: [] }
}
