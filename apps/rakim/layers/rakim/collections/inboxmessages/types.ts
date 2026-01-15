import type { z } from 'zod'
import type { rakimInboxMessageSchema } from './app/composables/useRakimInboxMessages'

export interface RakimInboxMessage {
  id: string
  teamId: string
  owner: string
  configId: string
  messageType: string
  from: string
  to: string
  subject: string
  htmlBody?: string
  textBody?: string
  receivedAt: Date | null
  read?: boolean
  forwardedTo?: string
  forwardedAt?: Date | null
  resendEmailId?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  optimisticId?: string
  optimisticAction?: 'create' | 'update' | 'delete'
}

export type RakimInboxMessageFormData = z.infer<typeof rakimInboxMessageSchema>
export type NewRakimInboxMessage = Omit<RakimInboxMessage, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

// Props type for the Form component
export interface RakimInboxMessageFormProps {
  items: string[] // Array of IDs for delete action
  activeItem: RakimInboxMessage | Record<string, never> // RakimInboxMessage for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}