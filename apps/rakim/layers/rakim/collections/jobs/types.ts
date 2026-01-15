import type { z } from 'zod'
import type { rakimJobSchema } from './app/composables/useRakimJobs'

export interface RakimJob {
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

export type RakimJobFormData = z.infer<typeof rakimJobSchema>
export type NewRakimJob = Omit<RakimJob, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

// Props type for the Form component
export interface RakimJobFormProps {
  items: string[] // Array of IDs for delete action
  activeItem: RakimJob | Record<string, never> // RakimJob for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}