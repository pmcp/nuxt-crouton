import type { z } from 'zod'
import type { rakimDiscussionSchema } from './app/composables/useRakimDiscussions'

export interface RakimDiscussion {
  id: string
  teamId: string
  owner: string
  sourceType: string
  sourceThreadId: string
  sourceUrl: string
  sourceConfigId: string
  title: string
  content: string
  authorHandle: string
  participants?: string[]
  status: string
  threadData?: Record<string, any>
  totalMessages?: number
  aiSummary?: string
  aiKeyPoints?: string[]
  aiTasks?: Record<string, any>
  isMultiTask?: boolean
  syncJobId?: string
  notionTaskIds?: string[]
  rawPayload?: Record<string, any>
  metadata?: Record<string, any>
  processedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  optimisticId?: string
  optimisticAction?: 'create' | 'update' | 'delete'
}

export type RakimDiscussionFormData = z.infer<typeof rakimDiscussionSchema>
export type NewRakimDiscussion = Omit<RakimDiscussion, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

// Props type for the Form component
export interface RakimDiscussionFormProps {
  items: string[] // Array of IDs for delete action
  activeItem: RakimDiscussion | Record<string, never> // RakimDiscussion for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}