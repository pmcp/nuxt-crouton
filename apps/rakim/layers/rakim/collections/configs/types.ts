import type { z } from 'zod'
import type { discubotConfigSchema } from './app/composables/useDiscubotConfigs'

export interface DiscubotConfig {
  id: string
  teamId: string
  owner: string
  sourceType: string
  name: string
  emailAddress?: string
  emailSlug?: string
  webhookUrl?: string
  webhookSecret?: string
  apiToken?: string
  notionToken: string
  notionDatabaseId: string
  notionFieldMapping?: Record<string, any>
  anthropicApiKey?: string
  aiEnabled: boolean
  aiSummaryPrompt?: string
  aiTaskPrompt?: string
  autoSync: boolean
  postConfirmation: boolean
  enableEmailForwarding: boolean
  active: boolean
  onboardingComplete: boolean
  sourceMetadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  optimisticId?: string
  optimisticAction?: 'create' | 'update' | 'delete'
}

export type DiscubotConfigFormData = z.infer<typeof discubotConfigSchema>
export type NewDiscubotConfig = Omit<DiscubotConfig, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

// Props type for the Form component
export interface DiscubotConfigFormProps {
  items: string[] // Array of IDs for delete action
  activeItem: DiscubotConfig | Record<string, never> // DiscubotConfig for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}