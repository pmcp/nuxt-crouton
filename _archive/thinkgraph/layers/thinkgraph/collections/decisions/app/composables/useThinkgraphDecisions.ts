/**
 * @crouton-generated
 * @collection decisions
 * @layer thinkgraph
 * @generated 2026-02-20
 *
 * ## AI Context
 * - Composable: useThinkgraphDecisions
 * - Collection name: thinkgraphDecisions
 * - API endpoint: /api/teams/[id]/thinkgraph-decisions
 * - Fields: content, type, pathType, starred, branchName, versionTag, source, model, parentId
 */

import { z } from 'zod'

export const thinkgraphDecisionSchema = z.object({
  content: z.string().min(1, 'content is required'),
  type: z.string().optional(),
  pathType: z.string().optional(),
  starred: z.boolean().optional(),
  branchName: z.string().optional(),
  versionTag: z.string().optional(),
  source: z.string().optional(),
  model: z.string().optional(),
  parentId: z.string().optional()
})

export const thinkgraphDecisionsColumns = [
  { accessorKey: 'content', header: 'Insight' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'pathType', header: 'Path Type' },
  { accessorKey: 'starred', header: 'Starred' },
  { accessorKey: 'branchName', header: 'Branch' },
  { accessorKey: 'versionTag', header: 'Version' }
]

const _thinkgraphDecisionsConfig = {
  name: 'thinkgraphDecisions',
  layer: 'thinkgraph',
  apiPath: 'thinkgraph-decisions',
  componentName: 'ThinkgraphDecisionsForm',
  defaultValues: {
    content: '',
    type: 'insight',
    pathType: '',
    starred: false,
    branchName: 'main',
    versionTag: 'v1',
    source: '',
    model: '',
    parentId: ''
  },
  columns: thinkgraphDecisionsColumns,
  fields: [
    { name: 'content', type: 'text', label: 'Insight', area: 'main' },
    { name: 'type', type: 'string', label: 'Type', area: 'sidebar' },
    { name: 'pathType', type: 'string', label: 'Path Type', area: 'sidebar' },
    { name: 'starred', type: 'boolean', label: 'Starred', area: 'sidebar' },
    { name: 'branchName', type: 'string', label: 'Branch', area: 'sidebar' },
    { name: 'versionTag', type: 'string', label: 'Version', area: 'sidebar' },
    { name: 'source', type: 'string', label: 'Source', area: 'meta' },
    { name: 'model', type: 'string', label: 'Model', area: 'meta' },
    { name: 'parentId', type: 'string', label: 'Parent', area: 'meta' }
  ]
}

// Add schema as non-enumerable property so klona skips it during cloning
Object.defineProperty(_thinkgraphDecisionsConfig, 'schema', {
  value: thinkgraphDecisionSchema,
  enumerable: false,
  configurable: false,
  writable: false
})

export const thinkgraphDecisionsConfig = _thinkgraphDecisionsConfig as typeof _thinkgraphDecisionsConfig & { schema: typeof thinkgraphDecisionSchema }

export const useThinkgraphDecisions = () => thinkgraphDecisionsConfig

export default function () {
  return {
    defaultValue: thinkgraphDecisionsConfig.defaultValues,
    schema: thinkgraphDecisionSchema,
    columns: thinkgraphDecisionsConfig.columns,
    collection: thinkgraphDecisionsConfig.name
  }
}
