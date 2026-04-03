import { streamText, generateText } from 'ai'
import { nanoid } from 'nanoid'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { createThinkgraphNode, getAllThinkgraphNodes, getThinkgraphNodesByIds } from '../../../../../../layers/thinkgraph/collections/nodes/server/database/queries'
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
    const content = [(targetDecision as any).title || targetDecision.content, (targetDecision as any).brief].filter(Boolean).join('\n\n')

    const { text } = await generateText({
      model: ai.model('claude-haiku-4-5-20251001'),
      system: `You decompose plans into sequential phases. Respond with ONLY a JSON object, no other text.

CRITICAL: The output is a CHAIN, not a flat list. Each phase is nested inside the previous one as a child. Parallel work items within a phase are siblings.

Return format:
{
  "items": [{
    "title": "Phase 1 title",
    "brief": "...",
    "template": "research",
    "children": [
      { "title": "parallel task A", "brief": "...", "template": "task" },
      { "title": "parallel task B", "brief": "...", "template": "task" },
      {
        "title": "Phase 2 title",
        "brief": "...",
        "template": "feature",
        "children": [
          { "title": "parallel task C", "brief": "...", "template": "task" },
          {
            "title": "Phase 3 title",
            "brief": "...",
            "template": "task"
          }
        ]
      }
    ]
  }]
}

The last child of each phase is the next phase — this creates a chain where each phase blocks the next.
Parallel tasks within a phase are siblings of the next phase.

Rules:
- 3-5 phases max. Each phase has 1-3 parallel tasks plus the next phase as last child.
- Templates: research = needs investigation, task = concrete work, feature = multi-step deliverable, idea = needs thinking.
- Start with research/discovery if requirements are vague.
- Keep titles short and actionable. Briefs: 1-2 sentences.
- Do NOT include time estimates or generic phases like "testing" and "deployment" unless requested.
- The top-level items array should have exactly 1 item (the first phase). Everything else is nested.`,
      prompt: content,
    })

    let items: DecomposeItem[]
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      const parsed = JSON.parse(jsonMatch[0])
      items = Array.isArray(parsed.items) ? parsed.items : []
    } catch {
      throw createError({ status: 500, statusText: 'AI returned invalid decompose response' })
    }

    // Build a path/depth cache so we can calculate for each new node
    const pathCache = new Map<string, { path: string; depth: number }>()
    // Seed with the target node's path/depth
    pathCache.set(nodeId, {
      path: (targetDecision as any).path || `/${nodeId}/`,
      depth: (targetDecision as any).depth ?? 0,
    })

    const created: any[] = []

    async function createDecomposeNodes(
      nodeItems: DecomposeItem[],
      parentId: string,
    ) {
      const parent = pathCache.get(parentId)
      const parentPath = parent?.path || `/${parentId}/`
      const parentDepth = parent?.depth ?? 0

      for (const item of nodeItems) {
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
          parentId,
          path,
          depth,
          status: 'idle',
          origin: 'ai',
          starred: false,
          teamId: team.id,
          owner: user.id,
        } as any)
        created.push(node)

        // Cache for children
        pathCache.set(recordId, { path, depth })

        if (item.children?.length) {
          await createDecomposeNodes(item.children, recordId)
        }
      }
    }

    await createDecomposeNodes(items, nodeId)
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
