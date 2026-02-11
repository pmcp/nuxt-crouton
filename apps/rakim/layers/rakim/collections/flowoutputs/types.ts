import type { z } from 'zod'
import type { rakimFlowOutputSchema } from './app/composables/useRakimFlowOutputs'

export interface RakimFlowOutput {
  id: string
  teamId: string
  owner: string
  flowId: string
  outputType: string
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

export type RakimFlowOutputFormData = z.infer<typeof rakimFlowOutputSchema>
export type NewRakimFlowOutput = Omit<RakimFlowOutput, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

// Props type for the Form component
export interface RakimFlowOutputFormProps {
  items: string[] // Array of IDs for delete action
  activeItem: RakimFlowOutput | Record<string, never> // RakimFlowOutput for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}