import type { z } from 'zod'
import type { rakimFlowInputSchema } from './app/composables/useRakimFlowInputs'

export interface RakimFlowInput {
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

export type RakimFlowInputFormData = z.infer<typeof rakimFlowInputSchema>
export type NewRakimFlowInput = Omit<RakimFlowInput, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

// Props type for the Form component
export interface RakimFlowInputFormProps {
  items: string[] // Array of IDs for delete action
  activeItem: RakimFlowInput | Record<string, never> // RakimFlowInput for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}