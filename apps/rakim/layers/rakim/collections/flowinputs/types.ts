import type { z } from 'zod'
import type { discubotFlowInputSchema } from './app/composables/useDiscubotFlowInputs'

export interface DiscubotFlowInput {
  id: string
  teamId: string
  owner: string
  flowId: string
  sourceType: string
  name: string
  apiToken?: string
  webhookUrl?: string
  webhookSecret?: string
  emailAddress?: string
  emailSlug?: string
  sourceMetadata?: Record<string, any>
  active: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  optimisticId?: string
  optimisticAction?: 'create' | 'update' | 'delete'
}

export type DiscubotFlowInputFormData = z.infer<typeof discubotFlowInputSchema>
export type NewDiscubotFlowInput = Omit<DiscubotFlowInput, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

// Props type for the Form component
export interface DiscubotFlowInputFormProps {
  items: string[] // Array of IDs for delete action
  activeItem: DiscubotFlowInput | Record<string, never> // DiscubotFlowInput for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}