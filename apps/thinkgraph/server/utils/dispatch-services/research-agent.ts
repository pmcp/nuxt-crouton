import { generateText } from 'ai'
import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

type NodeType = 'insight' | 'idea' | 'decision' | 'question'

interface NodeTree {
  content: string
  nodeType: NodeType
  children?: NodeTree[]
}

interface ResearchTree {
  summary: string
  nodes: NodeTree[]
}

const VALID_NODE_TYPES: readonly NodeType[] = ['insight', 'idea', 'decision', 'question']

function validateNode(raw: unknown, path: string): NodeTree {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`${path}: expected object, got ${typeof raw}`)
  }
  const obj = raw as Record<string, unknown>
  if (typeof obj.content !== 'string' || !obj.content.trim()) {
    throw new Error(`${path}.content: expected non-empty string`)
  }
  if (typeof obj.nodeType !== 'string' || !VALID_NODE_TYPES.includes(obj.nodeType as NodeType)) {
    throw new Error(`${path}.nodeType: expected one of ${VALID_NODE_TYPES.join('|')}, got ${obj.nodeType}`)
  }
  const children = obj.children
  let validatedChildren: NodeTree[] | undefined
  if (children !== undefined && children !== null) {
    if (!Array.isArray(children)) {
      throw new Error(`${path}.children: expected array`)
    }
    validatedChildren = children
      .slice(0, 5)
      .map((child, i) => validateNode(child, `${path}.children[${i}]`))
  }
  return {
    content: obj.content,
    nodeType: obj.nodeType as NodeType,
    children: validatedChildren,
  }
}

function validateTree(raw: unknown): ResearchTree {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`tree: expected object, got ${typeof raw}`)
  }
  const obj = raw as Record<string, unknown>
  if (typeof obj.summary !== 'string' || !obj.summary.trim()) {
    throw new Error('tree.summary: expected non-empty string')
  }
  if (!Array.isArray(obj.nodes) || obj.nodes.length < 2) {
    throw new Error('tree.nodes: expected array with at least 2 entries')
  }
  return {
    summary: obj.summary,
    nodes: obj.nodes.slice(0, 6).map((n, i) => validateNode(n, `tree.nodes[${i}]`)),
  }
}

function extractJson(text: string): string {
  // Strip ```json ... ``` fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  // Otherwise grab from first { to last }
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first !== -1 && last > first) return text.slice(first, last + 1)
  return text.trim()
}

registerDispatchService({
  id: 'research-agent',
  name: 'Deep Research',
  description: 'Analyze an idea from multiple angles and create a research subtree',
  type: 'text',
  icon: 'i-lucide-brain',
  options: [
    {
      key: 'focus',
      label: 'Research Focus',
      type: 'select',
      choices: ['full-analysis', 'market-research', 'technical-feasibility', 'go-to-market', 'risk-assessment'],
      default: 'full-analysis',
    },
    {
      key: 'maxDepth',
      label: 'Max Depth',
      type: 'select',
      choices: ['2', '3'],
      default: '2',
    },
  ],
  execute: async (context: DispatchContext, event: H3Event): Promise<DispatchResult> => {
    const ai = createAIProvider(event)
    const model = ai.getDefaultModel()
    const focus = (context.options?.focus as string) || 'full-analysis'
    const maxDepth = parseInt((context.options?.maxDepth as string) || '2', 10)

    const focusInstructions: Record<string, string> = {
      'full-analysis': `Analyze from all angles:
- Market opportunity & competition
- Technical feasibility & architecture
- Business model viability
- Key risks & mitigations
- Recommended next steps`,
      'market-research': `Focus on market analysis:
- Direct & indirect competitors (name real companies if possible)
- Market size estimation (TAM/SAM/SOM)
- Target customer segments
- Market trends & timing
- Competitive advantages needed`,
      'technical-feasibility': `Focus on technical analysis:
- Architecture options with trade-offs
- Key technical challenges & solutions
- Build vs buy decisions
- Infrastructure & scaling considerations
- Technical risks & unknowns`,
      'go-to-market': `Focus on go-to-market strategy:
- Launch strategy & channels
- Pricing model options
- Early adopter acquisition
- Growth loops & retention
- Key metrics to track`,
      'risk-assessment': `Focus on risk analysis:
- Market risks (timing, competition, demand)
- Technical risks (feasibility, scaling, dependencies)
- Business risks (unit economics, regulation, team)
- For each risk: likelihood, impact, and mitigation
- Overall risk score and recommendation`,
    }

    const jsonShape = `{
  "summary": "one-sentence summary of the entire analysis",
  "nodes": [
    {
      "content": "1-3 sentences",
      "nodeType": "insight" | "idea" | "decision" | "question",
      "children": [ /* same shape, optional, max 5 */ ]
    }
  ]
}`

    const result = await generateText({
      model: ai.model(model),
      system: `You are a senior strategist and researcher. Given an idea and its thinking context, produce a structured analysis tree.

${focusInstructions[focus] || focusInstructions['full-analysis']}

Rules:
- Each node should contain 1-3 sentences of specific, actionable content.
- Use real company names, real numbers, and real technologies where possible.
- Maximum tree depth: ${maxDepth} levels.
- Maximum 5 children per node, 2-6 top-level branches.
- Be opinionated — make recommendations, don't just list options.
- Mark nodes as "decision" when they represent a fork/choice, "question" for unknowns, "idea" for opportunities, "insight" for analysis.

Output format: Respond with ONLY a JSON object matching this shape (no prose, no markdown fences):

${jsonShape}`,
      prompt: `Analyze this idea:\n\n${context.prompt || context.nodeContent}\n\nThinking context:\n${context.thinkingPath}`,
    })

    let tree: ResearchTree
    try {
      const parsed = JSON.parse(extractJson(result.text))
      tree = validateTree(parsed)
    } catch (err) {
      throw createError({
        status: 502,
        statusText: `research-agent: model returned invalid JSON tree (${(err as Error).message})`,
      })
    }

    function countNodes(nodes: NodeTree[]): number {
      return nodes.reduce((acc, n) => acc + 1 + (n.children ? countNodes(n.children) : 0), 0)
    }
    const totalNodes = countNodes(tree.nodes)

    return {
      artifacts: [
        {
          type: 'text',
          provider: 'research-agent',
          content: JSON.stringify(tree, null, 2),
          prompt: context.prompt || context.nodeContent,
          metadata: { model, focus, maxDepth, totalNodes, isTree: true },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: tree.summary,
      childNodeType: 'insight',
      // Custom field: the tree structure for the dispatch endpoint to expand
      _tree: tree.nodes,
    } as DispatchResult & { _tree: NodeTree[] }
  },
})
