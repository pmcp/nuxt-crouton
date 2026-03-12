import { execFile } from 'node:child_process'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getAllThinkgraphDecisions } from '~~/layers/thinkgraph/collections/decisions/server/database/queries'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const body = await readBody(event)
  const { prompt, nodeIds, cwd } = body as {
    prompt: string
    nodeIds?: string[]
    cwd?: string
  }

  if (!prompt) {
    throw createError({ status: 400, statusText: 'prompt is required' })
  }

  // Build context from selected nodes
  let context = ''
  if (nodeIds?.length) {
    const all = await getAllThinkgraphDecisions(team.id)
    const selected = nodeIds
      .map(id => all.find((d: any) => d.id === id))
      .filter(Boolean) as any[]

    if (selected.length > 0) {
      context = '\n\nThinking graph context (selected nodes):\n'
      for (const node of selected) {
        context += `- [${node.nodeType}] ${node.content}\n`
        // Include artifacts content if available
        if (node.artifacts?.length) {
          for (const a of node.artifacts) {
            if (a.content) context += `  Artifact (${a.type}): ${a.content.slice(0, 500)}\n`
          }
        }
      }
    }
  }

  const fullPrompt = `${prompt}${context}`

  // Resolve project directory — use provided cwd or detect from runtime config
  const projectDir = cwd || process.env.THINKGRAPH_PROJECT_CWD || process.cwd()

  try {
    const result = await runClaude(fullPrompt, projectDir)
    return {
      response: result.stdout,
      exitCode: result.exitCode,
    }
  } catch (error: any) {
    throw createError({
      status: 500,
      statusText: `Claude CLI error: ${error.message}`,
    })
  }
})

function runClaude(prompt: string, cwd: string): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt, '--output-format', 'text']

    execFile('claude', args, {
      cwd,
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env },
    }, (error, stdout, stderr) => {
      if (error && !stdout) {
        reject(new Error(stderr || error.message))
        return
      }
      resolve({
        stdout: stdout.toString().trim(),
        exitCode: error ? (error as any).code || 1 : 0,
      })
    })
  })
}
