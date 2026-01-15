import type { z } from 'zod'
import type { discubotTaskSchema } from './app/composables/useDiscubotTasks'

export interface DiscubotTask {
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

export type DiscubotTaskFormData = z.infer<typeof discubotTaskSchema>
export type NewDiscubotTask = Omit<DiscubotTask, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

// Props type for the Form component
export interface DiscubotTaskFormProps {
  items: string[] // Array of IDs for delete action
  activeItem: DiscubotTask | Record<string, never> // DiscubotTask for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}