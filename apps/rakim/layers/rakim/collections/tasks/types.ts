import type { z } from 'zod'
import type { rakimTaskSchema } from './app/composables/useRakimTasks'

export interface RakimTask {
  id: string
  teamId: string
  owner: string
  discussionId: string
  syncJobId: string
  notionPageId: string
  notionPageUrl: string
  title: string
  description?: string
  status: string
  priority?: string
  assignee?: string
  summary?: string
  sourceUrl: string
  isMultiTaskChild: boolean
  taskIndex?: number
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  optimisticId?: string
  optimisticAction?: 'create' | 'update' | 'delete'
}

export type RakimTaskFormData = z.infer<typeof rakimTaskSchema>
export type NewRakimTask = Omit<RakimTask, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

// Props type for the Form component
export interface RakimTaskFormProps {
  items: string[] // Array of IDs for delete action
  activeItem: RakimTask | Record<string, never> // RakimTask for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}