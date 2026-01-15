import type { z } from 'zod'
import type { discubotInboxMessageSchema } from './app/composables/useDiscubotInboxMessages'

export interface DiscubotInboxMessage {
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

export type DiscubotInboxMessageFormData = z.infer<typeof discubotInboxMessageSchema>
export type NewDiscubotInboxMessage = Omit<DiscubotInboxMessage, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

// Props type for the Form component
export interface DiscubotInboxMessageFormProps {
  items: string[] // Array of IDs for delete action
  activeItem: DiscubotInboxMessage | Record<string, never> // DiscubotInboxMessage for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}