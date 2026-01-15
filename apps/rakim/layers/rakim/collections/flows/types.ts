import type { z } from 'zod'
import type { discubotFlowSchema } from './app/composables/useDiscubotFlows'

export interface DiscubotFlow {
  id: string
  teamId: string
  owner: string
  name: string
  description?: string
  availableDomains?: string[]
  aiEnabled: boolean
  anthropicApiKey?: string
  aiSummaryPrompt?: string
  aiTaskPrompt?: string
  replyPersonality?: string // Preset key (e.g., 'friendly') or 'custom:...' for AI prompt
  active: boolean
  onboardingComplete: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  optimisticId?: string
  optimisticAction?: 'create' | 'update' | 'delete'
}

export type DiscubotFlowFormData = z.infer<typeof discubotFlowSchema>
export type NewDiscubotFlow = Omit<DiscubotFlow, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

// Props type for the Form component
export interface DiscubotFlowFormProps {
  items: string[] // Array of IDs for delete action
  activeItem: DiscubotFlow | Record<string, never> // DiscubotFlow for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}