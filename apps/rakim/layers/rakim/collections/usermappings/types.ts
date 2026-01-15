import type { z } from 'zod'
import type { rakimUserMappingSchema } from './app/composables/useRakimUserMappings'

export interface RakimUserMapping {
  id: string
  teamId: string
  owner: string
  sourceType: string
  sourceWorkspaceId: string
  sourceUserId: string
  sourceUserEmail?: string
  sourceUserName?: string
  notionUserId: string | null // null = pending mapping (discovered but not yet mapped)
  notionUserName?: string
  notionUserEmail?: string
  mappingType: string
  confidence?: number
  active: boolean
  lastSyncedAt?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  optimisticId?: string
  optimisticAction?: 'create' | 'update' | 'delete'
}

export type RakimUserMappingFormData = z.infer<typeof rakimUserMappingSchema>
export type NewRakimUserMapping = Omit<RakimUserMapping, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

// Props type for the Form component
export interface RakimUserMappingFormProps {
  items: string[] // Array of IDs for delete action
  activeItem: RakimUserMapping | Record<string, never> // RakimUserMapping for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}