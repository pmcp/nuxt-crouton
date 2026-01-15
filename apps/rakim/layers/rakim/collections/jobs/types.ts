import type { z } from 'zod'
import type { discubotJobSchema } from './app/composables/useDiscubotJobs'

export interface DiscubotJob {
  id: string
  teamId: string
  owner: string
  discussionId: string
  sourceConfigId: string
  status: string
  stage?: string
  attempts: number
  maxAttempts: number
  error?: string
  errorStack?: string
  startedAt?: Date | null
  completedAt?: Date | null
  processingTime?: number
  taskIds?: string[]
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  optimisticId?: string
  optimisticAction?: 'create' | 'update' | 'delete'
}

export type DiscubotJobFormData = z.infer<typeof discubotJobSchema>
export type NewDiscubotJob = Omit<DiscubotJob, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

// Props type for the Form component
export interface DiscubotJobFormProps {
  items: string[] // Array of IDs for delete action
  activeItem: DiscubotJob | Record<string, never> // DiscubotJob for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}