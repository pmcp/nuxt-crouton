export interface ParsedDecision {
  content: string
  nodeType: string
  pathType: string
  confidence: number
}

const EXPLICIT_DECISION_RE = /^DECISION:\s*(\{.*\})\s*$/gm

const LABELED_LINE_RE = /^[-*]\s+\*{0,2}(Decision|Insight|Idea|Question|Observation)\*{0,2}:\s*(.+)/i

const NUMBERED_ITEM_RE = /^\d+\.\s+(.+)/

const LABEL_TO_NODE_TYPE: Record<string, string> = {
  decision: 'decision',
  insight: 'observation',
  idea: 'idea',
  question: 'question',
  observation: 'observation',
}

function parseExplicitDecisions(text: string): ParsedDecision[] {
  const results: ParsedDecision[] = []
  let match: RegExpExecArray | null

  // Reset lastIndex for global regex
  EXPLICIT_DECISION_RE.lastIndex = 0

  while ((match = EXPLICIT_DECISION_RE.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      results.push({
        content: parsed.content ?? '',
        nodeType: parsed.nodeType ?? 'decision',
        pathType: parsed.pathType ?? 'explored',
        confidence: 1.0,
      })
    }
    catch {
      // Malformed JSON — skip
    }
  }

  return results
}

function parseLabeledLines(lines: string[]): ParsedDecision[] {
  const results: ParsedDecision[] = []

  for (const line of lines) {
    const match = line.trim().match(LABELED_LINE_RE)
    if (!match) continue

    const label = match[1].toLowerCase()
    const content = match[2].trim()

    if (content.length < 10) continue

    results.push({
      content,
      nodeType: LABEL_TO_NODE_TYPE[label] ?? 'observation',
      pathType: 'pending',
      confidence: 0.8,
    })
  }

  return results
}

function parseNumberedItems(lines: string[]): ParsedDecision[] {
  const results: ParsedDecision[] = []

  for (const line of lines) {
    const match = line.trim().match(NUMBERED_ITEM_RE)
    if (!match) continue

    const content = match[1].trim()

    if (content.length <= 20) continue

    results.push({
      content,
      nodeType: 'observation',
      pathType: 'pending',
      confidence: 0.5,
    })
  }

  return results
}

function parse(text: string): ParsedDecision[] {
  if (!text || !text.trim()) return []

  const lines = text.split('\n')

  // Collect from all strategies
  const explicit = parseExplicitDecisions(text)
  const labeled = parseLabeledLines(lines)
  const numbered = parseNumberedItems(lines)

  // Deduplicate: explicit wins over labeled over numbered.
  // Use content as the dedup key.
  const seen = new Set<string>()
  const results: ParsedDecision[] = []

  for (const group of [explicit, labeled, numbered]) {
    for (const item of group) {
      const key = item.content.toLowerCase().trim()
      if (!seen.has(key)) {
        seen.add(key)
        results.push(item)
      }
    }
  }

  return results
}

export function useDecisionParser() {
  function useReactiveParse(input: Ref<string>): ComputedRef<ParsedDecision[]> {
    return computed(() => parse(input.value))
  }

  return { parse, useReactiveParse }
}
