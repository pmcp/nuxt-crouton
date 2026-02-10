import type { PackageManifest } from '@fyit/crouton-schema-designer/types'
import discussionSchema from './schemas/discussion.json'
import flowSchema from './schemas/flow.json'
import flowInputSchema from './schemas/flow-input.json'
import flowOutputSchema from './schemas/flow-output.json'
import taskSchema from './schemas/task.json'
import jobSchema from './schemas/job.json'
import userMappingSchema from './schemas/user-mapping.json'
import inboxMessageSchema from './schemas/inbox-message.json'

const manifest: PackageManifest = {
  id: 'crouton-triage',
  name: 'Discussion Triage',
  description: 'AI-powered discussion-to-task triage system with multi-source adapters (Slack, Figma, Notion), domain routing, and automated task creation.',
  icon: 'i-heroicons-funnel',
  version: '1.0.0',

  layer: {
    name: 'triage',
    editable: false,
    reason: 'Table names are prefixed with "triage" (e.g., triageDiscussions). This cannot be changed.'
  },

  dependencies: [
    '@fyit/crouton',
    '@fyit/crouton-auth',
    '@fyit/crouton-ai'
  ],

  collections: [
    {
      name: 'discussion',
      tableName: 'triageDiscussions',
      description: 'Ingested discussions from external sources (Slack threads, Figma comments, Notion pages) with AI analysis results.',
      schema: discussionSchema,
      schemaPath: './schemas/discussion.json'
    },
    {
      name: 'flow',
      tableName: 'triageFlows',
      description: 'Multi-input/multi-output workflow configurations with AI domain routing.',
      schema: flowSchema,
      schemaPath: './schemas/flow.json'
    },
    {
      name: 'flowinput',
      tableName: 'triageFlowinputs',
      description: 'Input sources connected to flows (Slack workspace, Figma project, email endpoint).',
      schema: flowInputSchema,
      schemaPath: './schemas/flow-input.json'
    },
    {
      name: 'flowoutput',
      tableName: 'triageFlowoutputs',
      description: 'Output destinations for flows with domain-based routing (Notion databases, GitHub, Linear).',
      schema: flowOutputSchema,
      schemaPath: './schemas/flow-output.json'
    },
    {
      name: 'task',
      tableName: 'triageTasks',
      description: 'AI-detected tasks created in external systems (Notion pages) with sync tracking.',
      schema: taskSchema,
      schemaPath: './schemas/task.json'
    },
    {
      name: 'job',
      tableName: 'triageJobs',
      description: 'Processing job records for pipeline observability and retry management.',
      schema: jobSchema,
      schemaPath: './schemas/job.json'
    },
    {
      name: 'usermapping',
      tableName: 'triageUsermappings',
      description: 'Cross-platform user identity mappings (Slack/Figma user → Notion user).',
      schema: userMappingSchema,
      schemaPath: './schemas/user-mapping.json'
    },
    {
      name: 'inboxmessage',
      tableName: 'triageInboxmessages',
      description: 'Email inbox for forwarded messages with classification and routing.',
      schema: inboxMessageSchema,
      schemaPath: './schemas/inbox-message.json'
    }
  ],

  configuration: {
    'anthropicApiKey': {
      type: 'string',
      label: 'Anthropic API Key',
      description: 'API key for Claude AI analysis. Can be set globally or per-flow.',
      default: ''
    },
    'slack.clientId': {
      type: 'string',
      label: 'Slack Client ID',
      description: 'Slack app client ID for OAuth installation.',
      default: ''
    },
    'slack.clientSecret': {
      type: 'string',
      label: 'Slack Client Secret',
      description: 'Slack app client secret for OAuth.',
      default: ''
    },
    'slack.signingSecret': {
      type: 'string',
      label: 'Slack Signing Secret',
      description: 'Slack webhook signing secret for request verification.',
      default: ''
    },
    'resend.apiKey': {
      type: 'string',
      label: 'Resend API Key',
      description: 'Resend API key for email forwarding features.',
      default: ''
    }
  },

  extensionPoints: [
    {
      collection: 'discussion',
      allowedFields: ['metadata', 'rawPayload'],
      description: 'Add custom metadata to discussion records.'
    },
    {
      collection: 'task',
      allowedFields: ['metadata'],
      description: 'Add custom metadata to task records.'
    },
    {
      collection: 'flow',
      allowedFields: ['aiSummaryPrompt', 'aiTaskPrompt'],
      description: 'Customize AI prompts per flow.'
    }
  ],

  provides: {
    composables: [
      'useTriageOAuth',
      'useTriageAutoMatch',
      'useTriageNotionSchema',
      'useTriageNotionUsers',
      'useTriageSlackUsers',
      'useTriageFieldMapping',
      'useTriagePromptPreview'
    ],
    components: [
      { name: 'CroutonTriageFlowBuilder', description: 'Flow configuration wizard', props: ['flowId', 'teamId'] },
      { name: 'CroutonTriageFlowList', description: 'Flow listing with status indicators', props: ['teamId'] },
      { name: 'CroutonTriageFlowPipelineVisual', description: 'Visual pipeline diagram', props: ['flow', 'inputs', 'outputs'] },
      { name: 'CroutonTriageInputManager', description: 'Manage flow input sources', props: ['flowId'] },
      { name: 'CroutonTriageOutputManager', description: 'Manage flow output destinations', props: ['flowId'] },
      { name: 'CroutonTriageUserMappingTable', description: 'User mapping management table', props: ['teamId'] },
      { name: 'CroutonTriageUserMappingDrawer', description: 'User mapping detail drawer', props: ['mapping'] },
      { name: 'CroutonTriageEmptyState', description: 'Empty state for triage views', props: ['type'] },
      { name: 'CroutonTriageLoadingSkeleton', description: 'Loading skeleton for triage views', props: [] }
    ],
    apiRoutes: [
      '/api/crouton-triage/webhooks/slack',
      '/api/crouton-triage/webhooks/figma-email',
      '/api/crouton-triage/webhooks/notion',
      '/api/crouton-triage/webhooks/notion-input',
      '/api/crouton-triage/webhooks/resend',
      '/api/crouton-triage/teams/[id]/discussions/process',
      '/api/crouton-triage/teams/[id]/discussions/[discussionId]/retry',
      '/api/crouton-triage/teams/[id]/notion/users',
      '/api/crouton-triage/teams/[id]/slack/users',
      '/api/crouton-triage/teams/[id]/user-mappings/bulk-import',
      '/api/crouton-triage/teams/[id]/ai/suggest-icons',
      '/api/crouton-triage/oauth/slack/install',
      '/api/crouton-triage/oauth/slack/callback',
      '/api/crouton-triage/health',
      '/api/crouton-triage/metrics'
    ]
  }
}

export default manifest
