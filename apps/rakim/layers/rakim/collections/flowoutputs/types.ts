import type { z } from 'zod'
import type { discubotFlowOutputSchema } from './app/composables/useDiscubotFlowOutputs'

export interface DiscubotFlowOutput {
  id: string
  teamId: string
  owner: string
  flowId: string
  outputType: string
  name: string
  domainFilter?: string[]
  isDefault?: boolean
  outputConfig?: Record<string, any>
  active: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  optimisticId?: string
  optimisticAction?: 'create' | 'update' | 'delete'
}

export type DiscubotFlowOutputFormData = z.infer<typeof discubotFlowOutputSchema>
export type NewDiscubotFlowOutput = Omit<DiscubotFlowOutput, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

// Props type for the Form component
export interface DiscubotFlowOutputFormProps {
  items: string[] // Array of IDs for delete action
  activeItem: DiscubotFlowOutput | Record<string, never> // DiscubotFlowOutput for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}