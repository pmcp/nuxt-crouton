import { z } from 'zod'

export const discubotConfigSchema = z.object({
  sourceType: z.string().min(1, 'sourceType is required'),
  name: z.string().min(1, 'name is required'),
  emailAddress: z.string().optional(),
  emailSlug: z.string().optional(),
  webhookUrl: z.string().optional(),
  webhookSecret: z.string().optional(),
  apiToken: z.string().optional(),
  notionToken: z.string().min(1, 'notionToken is required'),
  notionDatabaseId: z.string().min(1, 'notionDatabaseId is required'),
  notionFieldMapping: z.record(z.any()).optional(),
  anthropicApiKey: z.string().optional(),
  aiEnabled: z.boolean(),
  aiSummaryPrompt: z.string().optional(),
  aiTaskPrompt: z.string().optional(),
  autoSync: z.boolean(),
  postConfirmation: z.boolean(),
  enableEmailForwarding: z.boolean(),
  active: z.boolean(),
  onboardingComplete: z.boolean(),
  sourceMetadata: z.record(z.any()).optional()
})

export const discubotConfigsColumns = [
  { accessorKey: 'sourceType', header: 'SourceType' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'emailAddress', header: 'EmailAddress' },
  { accessorKey: 'emailSlug', header: 'EmailSlug' },
  { accessorKey: 'webhookUrl', header: 'WebhookUrl' },
  { accessorKey: 'webhookSecret', header: 'WebhookSecret' },
  { accessorKey: 'apiToken', header: 'ApiToken' },
  { accessorKey: 'notionToken', header: 'NotionToken' },
  { accessorKey: 'notionDatabaseId', header: 'NotionDatabaseId' },
  { accessorKey: 'notionFieldMapping', header: 'NotionFieldMapping' },
  { accessorKey: 'anthropicApiKey', header: 'AnthropicApiKey' },
  { accessorKey: 'aiEnabled', header: 'AiEnabled' },
  { accessorKey: 'aiSummaryPrompt', header: 'AiSummaryPrompt' },
  { accessorKey: 'aiTaskPrompt', header: 'AiTaskPrompt' },
  { accessorKey: 'autoSync', header: 'AutoSync' },
  { accessorKey: 'postConfirmation', header: 'PostConfirmation' },
  { accessorKey: 'enableEmailForwarding', header: 'EnableEmailForwarding' },
  { accessorKey: 'active', header: 'Active' },
  { accessorKey: 'onboardingComplete', header: 'OnboardingComplete' },
  { accessorKey: 'sourceMetadata', header: 'SourceMetadata' }
]

export const discubotConfigsConfig = {
  name: 'discubotConfigs',
  layer: 'discubot',
  apiPath: 'discubot-configs',
  componentName: 'DiscubotConfigsForm',
  schema: discubotConfigSchema,
  defaultValues: {
    sourceType: '',
    name: '',
    emailAddress: '',
    emailSlug: '',
    webhookUrl: '',
    webhookSecret: '',
    apiToken: '',
    notionToken: '',
    notionDatabaseId: '',
    notionFieldMapping: {},
    anthropicApiKey: '',
    aiEnabled: false,
    aiSummaryPrompt: '',
    aiTaskPrompt: '',
    autoSync: false,
    postConfirmation: false,
    enableEmailForwarding: false,
    active: false,
    onboardingComplete: false,
    sourceMetadata: {}
  },
  columns: discubotConfigsColumns,
}

export const useDiscubotConfigs = () => discubotConfigsConfig

// Default export for auto-import compatibility
export default function () {
  return {
    defaultValue: discubotConfigsConfig.defaultValues,
    schema: discubotConfigsConfig.schema,
    columns: discubotConfigsConfig.columns,
    collection: discubotConfigsConfig.name
  }
}