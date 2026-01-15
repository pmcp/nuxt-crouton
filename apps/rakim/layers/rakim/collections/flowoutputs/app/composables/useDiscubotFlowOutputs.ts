import { z } from 'zod'

export const discubotFlowOutputSchema = z.object({
  flowId: z.string().min(1, 'flowId is required'),
  outputType: z.string().min(1, 'outputType is required'),
  name: z.string().min(1, 'name is required'),
  domainFilter: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
  outputConfig: z.record(z.any()).optional(),
  active: z.boolean()
})

export const discubotFlowOutputsColumns = [
  { accessorKey: 'flowId', header: 'FlowId' },
  { accessorKey: 'outputType', header: 'OutputType' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'domainFilter', header: 'DomainFilter' },
  { accessorKey: 'isDefault', header: 'IsDefault' },
  { accessorKey: 'outputConfig', header: 'OutputConfig' },
  { accessorKey: 'active', header: 'Active' }
]

export const discubotFlowOutputsConfig = {
  name: 'discubotFlowOutputs',
  layer: 'discubot',
  apiPath: 'discubot-flowoutputs',
  componentName: 'DiscubotFlowOutputsForm',
  schema: discubotFlowOutputSchema,
  defaultValues: {
    flowId: '',
    outputType: '',
    name: '',
    domainFilter: [],
    isDefault: false,
    outputConfig: {},
    active: false
  },
  columns: discubotFlowOutputsColumns,
}

export const useDiscubotFlowOutputs = () => discubotFlowOutputsConfig

// Default export for auto-import compatibility
export default function () {
  return {
    defaultValue: discubotFlowOutputsConfig.defaultValues,
    schema: discubotFlowOutputsConfig.schema,
    columns: discubotFlowOutputsConfig.columns,
    collection: discubotFlowOutputsConfig.name
  }
}