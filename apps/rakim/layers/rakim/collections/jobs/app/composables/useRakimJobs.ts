import { z } from 'zod'

export const rakimJobSchema = z.object({
  discussionId: z.string().min(1, 'discussionId is required'),
  sourceConfigId: z.string().min(1, 'sourceConfigId is required'),
  status: z.string().min(1, 'status is required'),
  stage: z.string().optional(),
  attempts: z.number(),
  maxAttempts: z.number(),
  error: z.string().optional(),
  errorStack: z.string().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  processingTime: z.number().optional(),
  taskIds: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
})

export const rakimJobsColumns = [
  { accessorKey: 'discussionId', header: 'DiscussionId' },
  { accessorKey: 'sourceConfigId', header: 'SourceConfigId' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'stage', header: 'Stage' },
  { accessorKey: 'attempts', header: 'Attempts' },
  { accessorKey: 'maxAttempts', header: 'MaxAttempts' },
  { accessorKey: 'error', header: 'Error' },
  { accessorKey: 'errorStack', header: 'ErrorStack' },
  { accessorKey: 'startedAt', header: 'StartedAt' },
  { accessorKey: 'completedAt', header: 'CompletedAt' },
  { accessorKey: 'processingTime', header: 'ProcessingTime' },
  { accessorKey: 'taskIds', header: 'TaskIds' },
  { accessorKey: 'metadata', header: 'Metadata' }
]

export const rakimJobsConfig = {
  name: 'rakimJobs',
  layer: 'rakim',
  apiPath: 'rakim-jobs',
  componentName: 'RakimJobsForm',
  schema: rakimJobSchema,
  defaultValues: {
    discussionId: '',
    sourceConfigId: '',
    status: '',
    stage: '',
    attempts: 0,
    maxAttempts: 0,
    error: '',
    errorStack: '',
    startedAt: null,
    completedAt: null,
    processingTime: 0,
    taskIds: [],
    metadata: {}
  },
  columns: rakimJobsColumns,
}

export const useRakimJobs = () => rakimJobsConfig

// Default export for auto-import compatibility
export default function () {
  return {
    defaultValue: rakimJobsConfig.defaultValues,
    schema: rakimJobsConfig.schema,
    columns: rakimJobsConfig.columns,
    collection: rakimJobsConfig.name
  }
}