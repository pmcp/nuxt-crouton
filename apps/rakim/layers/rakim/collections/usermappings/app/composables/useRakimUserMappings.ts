import { z } from 'zod'

export const rakimUserMappingSchema = z.object({
  sourceType: z.string().min(1, 'sourceType is required'),
  sourceWorkspaceId: z.string().min(1, 'sourceWorkspaceId is required'),
  sourceUserId: z.string().min(1, 'sourceUserId is required'),
  sourceUserEmail: z.string().optional(),
  sourceUserName: z.string().optional(),
  notionUserId: z.string().min(1, 'notionUserId is required'),
  notionUserName: z.string().optional(),
  notionUserEmail: z.string().optional(),
  mappingType: z.string().min(1, 'mappingType is required'),
  confidence: z.number().optional(),
  active: z.boolean(),
  lastSyncedAt: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

export const rakimUserMappingsColumns = [
  { accessorKey: 'sourceType', header: 'SourceType' },
  { accessorKey: 'sourceWorkspaceId', header: 'SourceWorkspaceId' },
  { accessorKey: 'sourceUserId', header: 'SourceUserId' },
  { accessorKey: 'sourceUserEmail', header: 'SourceUserEmail' },
  { accessorKey: 'sourceUserName', header: 'SourceUserName' },
  { accessorKey: 'notionUserId', header: 'NotionUserId' },
  { accessorKey: 'notionUserName', header: 'NotionUserName' },
  { accessorKey: 'notionUserEmail', header: 'NotionUserEmail' },
  { accessorKey: 'mappingType', header: 'MappingType' },
  { accessorKey: 'confidence', header: 'Confidence' },
  { accessorKey: 'active', header: 'Active' },
  { accessorKey: 'lastSyncedAt', header: 'LastSyncedAt' },
  { accessorKey: 'metadata', header: 'Metadata' }
]

export const rakimUserMappingsConfig = {
  name: 'rakimUserMappings',
  layer: 'rakim',
  apiPath: 'rakim-usermappings',
  componentName: 'RakimUserMappingsForm',
  schema: rakimUserMappingSchema,
  defaultValues: {
    sourceType: '',
    sourceWorkspaceId: '',
    sourceUserId: '',
    sourceUserEmail: '',
    sourceUserName: '',
    notionUserId: '',
    notionUserName: '',
    notionUserEmail: '',
    mappingType: '',
    confidence: 0,
    active: false,
    lastSyncedAt: '',
    metadata: {}
  },
  columns: rakimUserMappingsColumns,
}

export const useRakimUserMappings = () => rakimUserMappingsConfig

// Default export for auto-import compatibility
export default function () {
  return {
    defaultValue: rakimUserMappingsConfig.defaultValues,
    schema: rakimUserMappingsConfig.schema,
    columns: rakimUserMappingsConfig.columns,
    collection: rakimUserMappingsConfig.name
  }
}