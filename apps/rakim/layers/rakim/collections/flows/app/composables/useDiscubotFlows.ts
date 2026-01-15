import { z } from 'zod'

export const discubotFlowSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  availableDomains: z.array(z.string()).optional(),
  aiEnabled: z.boolean(),
  anthropicApiKey: z.string().optional(),
  aiSummaryPrompt: z.string().optional(),
  aiTaskPrompt: z.string().optional(),
  replyPersonality: z.string().optional(),
  active: z.boolean(),
  onboardingComplete: z.boolean()
})

export const discubotFlowsColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'availableDomains', header: 'AvailableDomains' },
  { accessorKey: 'aiEnabled', header: 'AiEnabled' },
  { accessorKey: 'anthropicApiKey', header: 'AnthropicApiKey' },
  { accessorKey: 'aiSummaryPrompt', header: 'AiSummaryPrompt' },
  { accessorKey: 'aiTaskPrompt', header: 'AiTaskPrompt' },
  { accessorKey: 'replyPersonality', header: 'ReplyPersonality' },
  { accessorKey: 'active', header: 'Active' },
  { accessorKey: 'onboardingComplete', header: 'OnboardingComplete' }
]

export const discubotFlowsConfig = {
  name: 'discubotFlows',
  layer: 'discubot',
  apiPath: 'discubot-flows',
  componentName: 'DiscubotFlowsForm',
  schema: discubotFlowSchema,
  defaultValues: {
    name: '',
    description: '',
    availableDomains: [],
    aiEnabled: false,
    anthropicApiKey: '',
    aiSummaryPrompt: '',
    aiTaskPrompt: '',
    replyPersonality: '',
    active: false,
    onboardingComplete: false
  },
  columns: discubotFlowsColumns,
}

export const useDiscubotFlows = () => discubotFlowsConfig

// Default export for auto-import compatibility
export default function () {
  return {
    defaultValue: discubotFlowsConfig.defaultValues,
    schema: discubotFlowsConfig.schema,
    columns: discubotFlowsConfig.columns,
    collection: discubotFlowsConfig.name
  }
}