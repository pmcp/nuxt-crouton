import { z } from 'zod'

export const rakimInboxMessageSchema = z.object({
  configId: z.string().min(1, 'configId is required'),
  messageType: z.string().min(1, 'messageType is required'),
  from: z.string().min(1, 'from is required'),
  to: z.string().min(1, 'to is required'),
  subject: z.string().min(1, 'subject is required'),
  htmlBody: z.string().optional(),
  textBody: z.string().optional(),
  receivedAt: z.date({ required_error: 'receivedAt is required' }),
  read: z.boolean().optional(),
  forwardedTo: z.string().optional(),
  forwardedAt: z.date().optional(),
  resendEmailId: z.string().optional()
})

export const rakimInboxMessagesColumns = [
  { accessorKey: 'configId', header: 'ConfigId' },
  { accessorKey: 'messageType', header: 'MessageType' },
  { accessorKey: 'from', header: 'From' },
  { accessorKey: 'to', header: 'To' },
  { accessorKey: 'subject', header: 'Subject' },
  { accessorKey: 'htmlBody', header: 'HtmlBody' },
  { accessorKey: 'textBody', header: 'TextBody' },
  { accessorKey: 'receivedAt', header: 'ReceivedAt' },
  { accessorKey: 'read', header: 'Read' },
  { accessorKey: 'forwardedTo', header: 'ForwardedTo' },
  { accessorKey: 'forwardedAt', header: 'ForwardedAt' },
  { accessorKey: 'resendEmailId', header: 'ResendEmailId' }
]

export const rakimInboxMessagesConfig = {
  name: 'rakimInboxMessages',
  layer: 'rakim',
  apiPath: 'rakim-inboxmessages',
  componentName: 'RakimInboxMessagesForm',
  schema: rakimInboxMessageSchema,
  defaultValues: {
    configId: '',
    messageType: '',
    from: '',
    to: '',
    subject: '',
    htmlBody: '',
    textBody: '',
    receivedAt: null,
    read: false,
    forwardedTo: '',
    forwardedAt: null,
    resendEmailId: ''
  },
  columns: rakimInboxMessagesColumns,
}

export const useRakimInboxMessages = () => rakimInboxMessagesConfig

// Default export for auto-import compatibility
export default function () {
  return {
    defaultValue: rakimInboxMessagesConfig.defaultValues,
    schema: rakimInboxMessagesConfig.schema,
    columns: rakimInboxMessagesConfig.columns,
    collection: rakimInboxMessagesConfig.name
  }
}