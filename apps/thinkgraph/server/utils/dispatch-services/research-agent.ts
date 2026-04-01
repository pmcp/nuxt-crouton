import { generateObject } from 'ai'
import { z } from 'zod/v3'
import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'
import { createThinkgraphDecision } from '../../layers/thinkgraph/collections/nodes/server/database/queries'

const nodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    content: z.string().describe('The content of this node (1-3 sentences)'),
    nodeType: z.enum(['insight', 'idea', 'decision', 'question']).describe('Type of thinking'),
    children: z.array(nodeSchema).max(5).optional().describe('Child nodes (max 5)'),
  }),
)

const researchTreeSchema = z.object({
  summary: z.string().describe('One-sentence summary of the entire analysis'),
  nodes: z.array(nodeSchema).min(2).max(6).describe('Top-level branches of analysis'),
})

type NodeTree = z.infer<typeof nodeSchema>

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

    const result = await generateObject({
      model: ai.model(model),
      schema: researchTreeSchema,
      system: `You are a senior strategist and researcher. Given an idea and its thinking context, produce a structured analysis tree.

${focusInstructions[focus] || focusInstructions['full-analysis']}

Rules:
- Each node should contain 1-3 sentences of specific, actionable content.
- Use real company names, real numbers, and real technologies where possible.
- Maximum tree depth: ${maxDepth} levels.
- Maximum 5 children per node, 6 top-level branches.
- Be opinionated — make recommendations, don't just list options.
- Mark nodes as "decision" when they represent a fork/choice, "question" for unknowns, "idea" for opportunities, "insight" for analysis.`,
      prompt: `Analyze this idea:\n\n${context.prompt || context.nodeContent}\n\nThinking context:\n${context.thinkingPath}`,
    })

    const tree = result.object

    // Count total nodes for the summary
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
