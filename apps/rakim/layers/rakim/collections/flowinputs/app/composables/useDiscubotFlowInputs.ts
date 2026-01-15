import { z } from 'zod'

export const discubotFlowInputSchema = z.object({
  flowId: z.string().min(1, 'flowId is required'),
  sourceType: z.string().min(1, 'sourceType is required'),
  name: z.string().min(1, 'name is required'),
  apiToken: z.string().optional(),
  webhookUrl: z.string().optional(),
  webhookSecret: z.string().optional(),
  emailAddress: z.string().optional(),
  emailSlug: z.string().optional(),
  sourceMetadata: z.record(z.any()).optional(),
  active: z.boolean()
})

export const discubotFlowInputsColumns = [
  { accessorKey: 'flowId', header: 'FlowId' },
  { accessorKey: 'sourceType', header: 'SourceType' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'apiToken', header: 'ApiToken' },
  { accessorKey: 'webhookUrl', header: 'WebhookUrl' },
  { accessorKey: 'webhookSecret', header: 'WebhookSecret' },
  { accessorKey: 'emailAddress', header: 'EmailAddress' },
  { accessorKey: 'emailSlug', header: 'EmailSlug' },
  { accessorKey: 'sourceMetadata', header: 'SourceMetadata' },
  { accessorKey: 'active', header: 'Active' }
]

export const discubotFlowInputsConfig = {
  name: 'discubotFlowInputs',
  layer: 'discubot',
  apiPath: 'discubot-flowinputs',
  componentName: 'DiscubotFlowInputsForm',
  schema: discubotFlowInputSchema,
  defaultValues: {
    flowId: '',
    sourceType: '',
    name: '',
    apiToken: '',
    webhookUrl: '',
    webhookSecret: '',
    emailAddress: '',
    emailSlug: '',
    sourceMetadata: {},
    active: false
  },
  columns: discubotFlowInputsColumns,
}

export const useDiscubotFlowInputs = () => discubotFlowInputsConfig

// Default export for auto-import compatibility
export default function () {
  return {
    defaultValue: discubotFlowInputsConfig.defaultValues,
    schema: discubotFlowInputsConfig.schema,
    columns: discubotFlowInputsConfig.columns,
    collection: discubotFlowInputsConfig.name
  }
}