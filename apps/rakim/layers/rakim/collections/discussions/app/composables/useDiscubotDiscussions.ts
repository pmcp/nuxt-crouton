import { z } from 'zod'

export const discubotDiscussionSchema = z.object({
  sourceType: z.string().min(1, 'sourceType is required'),
  sourceThreadId: z.string().min(1, 'sourceThreadId is required'),
  sourceUrl: z.string().min(1, 'sourceUrl is required'),
  sourceConfigId: z.string().min(1, 'sourceConfigId is required'),
  title: z.string().min(1, 'title is required'),
  content: z.string().min(1, 'content is required'),
  authorHandle: z.string().min(1, 'authorHandle is required'),
  participants: z.array(z.string()).optional(),
  status: z.string().min(1, 'status is required'),
  threadData: z.record(z.any()).optional(),
  totalMessages: z.number().optional(),
  aiSummary: z.string().optional(),
  aiKeyPoints: z.array(z.string()).optional(),
  aiTasks: z.record(z.any()).optional(),
  isMultiTask: z.boolean().optional(),
  syncJobId: z.string().optional(),
  notionTaskIds: z.array(z.string()).optional(),
  rawPayload: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  processedAt: z.date().optional()
})

export const discubotDiscussionsColumns = [
  { accessorKey: 'sourceType', header: 'SourceType' },
  { accessorKey: 'sourceThreadId', header: 'SourceThreadId' },
  { accessorKey: 'sourceUrl', header: 'SourceUrl' },
  { accessorKey: 'sourceConfigId', header: 'SourceConfigId' },
  { accessorKey: 'title', header: 'Title' },
  { accessorKey: 'content', header: 'Content' },
  { accessorKey: 'authorHandle', header: 'AuthorHandle' },
  { accessorKey: 'participants', header: 'Participants' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'threadData', header: 'ThreadData' },
  { accessorKey: 'totalMessages', header: 'TotalMessages' },
  { accessorKey: 'aiSummary', header: 'AiSummary' },
  { accessorKey: 'aiKeyPoints', header: 'AiKeyPoints' },
  { accessorKey: 'aiTasks', header: 'AiTasks' },
  { accessorKey: 'isMultiTask', header: 'IsMultiTask' },
  { accessorKey: 'syncJobId', header: 'SyncJobId' },
  { accessorKey: 'notionTaskIds', header: 'NotionTaskIds' },
  { accessorKey: 'rawPayload', header: 'RawPayload' },
  { accessorKey: 'metadata', header: 'Metadata' },
  { accessorKey: 'processedAt', header: 'ProcessedAt' }
]

export const discubotDiscussionsConfig = {
  name: 'discubotDiscussions',
  layer: 'discubot',
  apiPath: 'discubot-discussions',
  componentName: 'DiscubotDiscussionsForm',
  schema: discubotDiscussionSchema,
  defaultValues: {
    sourceType: '',
    sourceThreadId: '',
    sourceUrl: '',
    sourceConfigId: '',
    title: '',
    content: '',
    authorHandle: '',
    participants: [],
    status: '',
    threadData: {},
    totalMessages: 0,
    aiSummary: '',
    aiKeyPoints: [],
    aiTasks: {},
    isMultiTask: false,
    syncJobId: '',
    notionTaskIds: [],
    rawPayload: {},
    metadata: {},
    processedAt: null
  },
  columns: discubotDiscussionsColumns,
}

export const useDiscubotDiscussions = () => discubotDiscussionsConfig

// Default export for auto-import compatibility
export default function () {
  return {
    defaultValue: discubotDiscussionsConfig.defaultValues,
    schema: discubotDiscussionsConfig.schema,
    columns: discubotDiscussionsConfig.columns,
    collection: discubotDiscussionsConfig.name
  }
}