/**
 * @crouton-generated
 * @collection decisions
 * @layer thinkgraph
 * @generated 2026-02-20
 */

import type { z } from 'zod'
import type { thinkgraphDecisionSchema } from './app/composables/useThinkgraphDecisions'

export interface ThinkgraphDecision {
  id: string
  teamId: string
  owner: string
  content: string
  type?: string
  pathType?: string
  starred?: boolean
  branchName?: string
  versionTag?: string
  source?: string
  model?: string
  parentId?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  optimisticId?: string
  optimisticAction?: 'create' | 'update' | 'delete'
}

export type ThinkgraphDecisionFormData = z.infer<typeof thinkgraphDecisionSchema>
export type NewThinkgraphDecision = Omit<ThinkgraphDecision, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

export interface ThinkgraphDecisionFormProps {
  items: string[]
  activeItem: ThinkgraphDecision | Record<string, never>
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}
