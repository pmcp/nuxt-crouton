/**
 * Generates markdown content files for ThinkGraph nodes.
 *
 * Format: frontmatter + section per completed stage.
 * Stored as a node-markdown artifact so the worker can commit it to git.
 */

export interface NodeMarkdownInput {
  id: string
  title: string
  summary?: string
  template?: string
  steps?: string[]
  signal?: string
  brief?: string
  /** Stage outputs from stage-output artifacts */
  stageOutputs: Array<{
    stage: string
    signal?: string
    output?: string
    timestamp?: string
  }>
  /** Compressed conversation logs per stage */
  conversationLogs?: Array<{
    stage: string
    log: string
  }>
}

/**
 * Build the markdown content for a node file.
 * Path convention: .thinkgraph/nodes/{nodeId}.md
 */
export function buildNodeMarkdown(input: NodeMarkdownInput): string {
  const lines: string[] = []

  // Frontmatter
  lines.push('---')
  lines.push(`id: ${input.id}`)
  if (input.summary) lines.push(`summary: "${input.summary.replace(/"/g, '\\"')}"`)
  if (input.template) lines.push(`template: ${input.template}`)
  if (input.steps?.length) lines.push(`steps: [${input.steps.join(', ')}]`)
  if (input.signal) lines.push(`signal: ${input.signal}`)
  lines.push('---')
  lines.push('')

  // Title
  lines.push(`# ${input.title}`)
  lines.push('')

  // Brief section
  if (input.brief) {
    lines.push('## Brief')
    lines.push(input.brief)
    lines.push('')
  }

  // Stage output sections
  for (const stage of input.stageOutputs) {
    const stageTitle = stage.stage.charAt(0).toUpperCase() + stage.stage.slice(1)
    lines.push(`## ${stageTitle}`)
    if (stage.output) {
      lines.push(stage.output)
    }
    lines.push('')

    // Append conversation log if available
    const log = input.conversationLogs?.find(l => l.stage === stage.stage)
    if (log?.log) {
      lines.push('<details>')
      lines.push(`<summary>Conversation log — ${stageTitle}</summary>`)
      lines.push('')
      lines.push(log.log)
      lines.push('')
      lines.push('</details>')
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * Extract stage outputs from a node's artifacts array.
 */
export function extractStageOutputs(artifacts: any[]): NodeMarkdownInput['stageOutputs'] {
  if (!Array.isArray(artifacts)) return []
  return artifacts
    .filter((a: any) => a?.type === 'stage-output')
    .map((a: any) => ({
      stage: a.stage,
      signal: a.signal,
      output: a.output,
      timestamp: a.timestamp,
    }))
}
