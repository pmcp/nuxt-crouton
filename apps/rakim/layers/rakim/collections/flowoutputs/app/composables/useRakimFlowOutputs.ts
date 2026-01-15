import { z } from 'zod'

export const rakimFlowOutputSchema = z.object({
  flowId: z.string().min(1, 'flowId is required'),
  outputType: z.string().min(1, 'outputType is required'),
  name: z.string().min(1, 'name is required'),
  domainFilter: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
  outputConfig: z.record(z.any()).optional(),
  active: z.boolean()
})

export const rakimFlowOutputsColumns = [
  { accessorKey: 'flowId', header: 'FlowId' },
  { accessorKey: 'outputType', header: 'OutputType' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'domainFilter', header: 'DomainFilter' },
  { accessorKey: 'isDefault', header: 'IsDefault' },
  { accessorKey: 'outputConfig', header: 'OutputConfig' },
  { accessorKey: 'active', header: 'Active' }
]

export const rakimFlowOutputsConfig = {
  name: 'rakimFlowOutputs',
  layer: 'rakim',
  apiPath: 'rakim-flowoutputs',
  componentName: 'RakimFlowOutputsForm',
  schema: rakimFlowOutputSchema,
  defaultValues: {
    flowId: '',
    outputType: '',
    name: '',
    domainFilter: [],
    isDefault: false,
    outputConfig: {},
    active: false
  },
  columns: rakimFlowOutputsColumns,
}

export const useRakimFlowOutputs = () => rakimFlowOutputsConfig

// Default export for auto-import compatibility
export default function () {
  return {
    defaultValue: rakimFlowOutputsConfig.defaultValues,
    schema: rakimFlowOutputsConfig.schema,
    columns: rakimFlowOutputsConfig.columns,
    collection: rakimFlowOutputsConfig.name
  }
}