import { streamText, generateText } from 'ai'
import { nanoid } from 'nanoid'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { createThinkgraphNode, getAllThinkgraphNodes, getThinkgraphNodesByIds, updateThinkgraphNode } from '../../../../../../layers/thinkgraph/collections/nodes/server/database/queries'
import { buildAncestorChain, buildPrompt } from '~~/server/utils/context-builder'

const TEMPLATE_STEPS: Record<string, string[]> = {
  idea: [],
  research: ['analyse'],
  task: ['analyst', 'builder', 'reviewer', 'merger'],
  feature: ['analyst', 'builder', 'launcher', 'reviewer', 'merger'],
  meta: ['analyst', 'builder', 'reviewer', 'merger'],
}

const VALID_TEMPLATES = new Set(['idea', 'research', 'task', 'feature', 'meta'])

const modeConfig: Record<string, { system: string; count: number }> = {
  diverge: {
    count: 5,
    system: `You generate diverse alternative approaches. For each, provide a fresh angle that hasn't been considered.
Respond with a JSON array. Each item: {"content": "...", "nodeType": "idea"|"question"|"observation"|"decision", "pathType": "explored"}`
  },
  deep_dive: {
    count: 4,
    system: `You go deep on a topic — implications, edge cases, trade-offs, second-order effects.
Respond with a JSON array. Each item: {"content": "...", "nodeType": "insight"|"question"|"observation", "pathType": "explored"}`
  },
  prototype: {
    count: 3,
    system: `You create practical, actionable steps. Be specific — names, tools, concrete approaches.
Respond with a JSON array. Each item: {"content": "...", "nodeType": "idea"|"decision", "pathType": "explored"}`
  },
  converge: {
    count: 2,
    system: `You synthesize multiple ideas into unified approaches. Find the common thread and create a coherent strategy.
Respond with a JSON array. Each item: {"content": "...", "nodeType": "decision", "pathType": "chosen"}`
  },
  validate: {
    count: 4,
    system: `You stress-test ideas. Find holes, risks, blind spots, and counterarguments. Be constructively critical.
Respond with a JSON array. Each item: {"content": "...", "nodeType": "question", "pathType": "pending"}`
  },
  default: {
    count: 3,
    system: `You help users explore decisions by generating diverse perspectives.
Generate exactly 3 child nodes:
1. A supporting perspective (nodeType: "idea")
2. A challenging question (nodeType: "question")
3. An alternative angle (nodeType: "observation")
Respond ONLY with valid JSON array. Each item: {"content": "...", "nodeType": "...", "pathType": "explored"}`
  }
}

// ─── Decompose mode types ───

interface DecomposeItem {
  title: string
  brief: string
  template: string
  dependsOn?: number[]
  children?: DecomposeItem[]
}

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)
  const nodeId = getRouterParam(event, 'nodeId')

  if (!nodeId) {
    throw createError({ status: 400, statusText: 'Decision ID required' })
  }

  const body = await readBody(event).catch(() => ({}))
  const mode = (body?.mode as string) || 'default'

  const targetGraphId = body?.graphId ? String(body.graphId) : undefined
  const allDecisions = await getAllThinkgraphNodes(team.id, targetGraphId)
  const targetDecision = allDecisions.find((d: any) => d.id === nodeId)

  if (!targetDecision) {
    throw createError({ status: 404, statusText: 'Decision not found' })
  }

  const ai = createAIProvider(event)

  // ─── Decompose mode: structured extraction ───
  if (mode === 'decompose') {
    const parentProjectId = (targetDecision as any).projectId || targetGraphId || ''
    // Use output (analyst analysis) + brief + title as context for decomposition
    const content = [(targetDecision as any).output, (targetDecision as any).brief, (targetDecision as any).title || targetDecision.content].filter(Boolean).join('\n\n')

    const { text } = await generateText({
      model: ai.model('claude-haiku-4-5-20251001'),
      system: `You decompose plans into work items with dependencies. Respond with ONLY a JSON object, no other text.

Return a FLAT list of items. Each item has a zero-based index. Use "dependsOn" to reference which items must complete before this one can start.

Return format:
{
  "items": [
    { "index": 0, "title": "Research auth providers", "brief": "...", "template": "research", "dependsOn": [] },
    { "index": 1, "title": "Design DB schema", "brief": "...", "template": "task", "dependsOn": [0] },
    { "index": 2, "title": "Build login API", "brief": "...", "template": "task", "dependsOn": [1] },
    { "index": 3, "title": "Build signup UI", "brief": "...", "template": "feature", "dependsOn": [1] },
    { "index": 4, "title": "Integration tests", "brief": "...", "template": "task", "dependsOn": [2, 3] }
  ]
}

Rules:
- 3-8 items. Keep it practical.
- dependsOn references other items by index. Items with no dependencies use [].
- Items with no dependsOn can run in parallel.
- Templates: research = needs investigation, task = concrete work, feature = multi-step deliverable, idea = needs thinking.
- Start with research/discovery if requirements are vague.
- Keep titles short and actionable. Briefs: 1-2 sentences.
- Do NOT include time estimates or generic phases like "testing" and "deployment" unless requested.
- The dependency graph must be a DAG (no circular dependencies).`,
      prompt: content,
    })

    let items: (DecomposeItem & { index: number })[]
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      const parsed = JSON.parse(jsonMatch[0])
      items = Array.isArray(parsed.items) ? parsed.items : []
    } catch {
      throw createError({ status: 500, statusText: 'AI returned invalid decompose response' })
    }

    const parentPath = (targetDecision as any).path || `/${nodeId}/`
    const parentDepth = (targetDecision as any).depth ?? 0

    // First pass: create all nodes, track index → real ID
    const indexToId = new Map<number, string>()
    const created: any[] = []

    for (const item of items) {
      const tmpl = VALID_TEMPLATES.has(item.template) ? item.template : 'idea'
      const steps = TEMPLATE_STEPS[tmpl] || []
      const recordId = nanoid()
      const path = `${parentPath}${recordId}/`
      const depth = parentDepth + 1

      const node = await createThinkgraphNode({
        id: recordId,
        title: item.title,
        brief: item.brief,
        template: tmpl,
        steps,
        projectId: parentProjectId,
        parentId: nodeId,
        path,
        depth,
        status: 'idle',
        origin: 'ai',
        starred: false,
        dependsOn: [],
        teamId: team.id,
        owner: user.id,
      } as any)
      created.push(node)
      indexToId.set(item.index ?? items.indexOf(item), recordId)
    }

    // Second pass: resolve dependsOn indices → real IDs and update
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const deps = (item.dependsOn || [])
        .map(idx => indexToId.get(idx))
        .filter(Boolean) as string[]

      if (deps.length > 0) {
        const nodeRealId = indexToId.get(item.index ?? i)!
        await updateThinkgraphNode(nodeRealId, team.id, user.id, { dependsOn: deps } as any, { role: 'admin' })
        // Update the created array too so the response reflects deps
        const createdNode = created.find(n => n.id === nodeRealId)
        if (createdNode) createdNode.dependsOn = deps
      }
    }

    return created
  }

  // ─── Standard expand modes ───
  const config = modeConfig[mode] || modeConfig.default

  const ancestors = buildAncestorChain(allDecisions, nodeId)
  const ancestorIds = new Set(ancestors.map((a: any) => a.id))
  const siblings = allDecisions.filter((d: any) => d.parentId === targetDecision.parentId && d.id !== nodeId)
  const children = allDecisions.filter((d: any) => d.parentId === nodeId)
  const starred = allDecisions.filter((d: any) => d.starred && d.id !== nodeId)
  const pinned = allDecisions.filter((d: any) => d.pinned && d.id !== nodeId && !ancestorIds.has(d.id))

  const result = await streamText({
    model: ai.model(ai.getDefaultModel()),
    system: config.system + `\n\nKeep each content to 1-2 sentences. Be concise but insightful.`,
    prompt: buildPrompt(targetDecision, ancestors, siblings, children, starred, config.count, pinned),
  })

  let fullText = ''
  for await (const chunk of result.textStream) {
    fullText += chunk
  }

  let perspectives: Array<{ content: string; nodeType: string; pathType: string }>
  try {
    const jsonMatch = fullText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array found')
    perspectives = JSON.parse(jsonMatch[0])
  } catch {
    throw createError({ status: 500, statusText: 'AI returned invalid response' })
  }

  const created = []
  for (const p of perspectives) {
    const decision = await createThinkgraphNode({
      content: p.content,
      nodeType: p.nodeType || 'idea',
      pathType: p.pathType || 'explored',
      graphId: (targetDecision as any).graphId || '',
      parentId: nodeId,
      source: 'ai',
      model: ai.getDefaultModel(),
      starred: false,
      branchName: '',
      versionTag: '',
      teamId: team.id,
      owner: user.id,
    } as any)
    created.push(decision)
  }

  return created
})
