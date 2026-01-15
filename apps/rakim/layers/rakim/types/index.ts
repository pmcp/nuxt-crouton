/**
 * Shared TypeScript types for Discubot
 *
 * These types are used across services, adapters, and the processor pipeline.
 */

/**
 * Supported source types for discussion inputs
 */
export type SourceType = 'figma' | 'slack' | 'notion'

/**
 * A single message in a discussion thread
 */
export interface ThreadMessage {
  id: string
  /** Source user ID (e.g., Figma user ID, Slack user ID) */
  authorHandle: string
  /** Resolved display name (populated from user mappings if available) */
  authorName?: string
  content: string
  timestamp: Date
  attachments?: Attachment[]
}

/**
 * File attachment metadata
 */
export interface Attachment {
  url: string
  fileName: string
  mimeType?: string
  size?: number
}

/**
 * Complete discussion thread with all messages
 * This is stored as JSON in discussions.threadData
 */
export interface DiscussionThread {
  id: string
  rootMessage: ThreadMessage
  replies: ThreadMessage[]
  participants: string[]
  metadata: Record<string, any>
}

/**
 * AI-generated summary of a discussion
 */
export interface AISummary {
  summary: string
  keyPoints: string[]
  sentiment?: 'positive' | 'neutral' | 'negative'
  confidence?: number
  /** AI-detected primary domain for the discussion (e.g., design, frontend, backend) or null if uncertain */
  domain?: string | null
}

/**
 * A single detected task from AI analysis
 *
 * Note: Fields use optional (?) syntax which allows null/undefined.
 * AI should return null when uncertain to maintain data quality.
 */
export interface DetectedTask {
  title: string
  description: string
  /** Task-specific action items (concrete steps for THIS task only) */
  actionItems?: string[] | null
  /** Priority level - AI returns null if uncertain */
  priority?: 'low' | 'medium' | 'high' | 'urgent' | null
  /** Task type - AI returns null if uncertain */
  type?: 'bug' | 'feature' | 'question' | 'improvement' | null
  /** Assignee as Slack/Figma user ID or email - AI returns null if uncertain */
  assignee?: string | null
  /** AI-detected domain (design/frontend/backend/etc.) or null if uncertain */
  domain?: string | null
  dueDate?: Date | null
  tags?: string[] | null
}

/**
 * Result of AI task detection
 */
export interface TaskDetectionResult {
  isMultiTask: boolean
  tasks: DetectedTask[]
  confidence?: number
}

/**
 * Complete AI analysis result
 */
export interface AIAnalysisResult {
  summary: AISummary
  taskDetection: TaskDetectionResult
  processingTime: number
  cached: boolean
}

/**
 * Discussion status values
 */
export type DiscussionStatus =
  | 'pending'
  | 'processing'
  | 'analyzed'
  | 'completed'
  | 'failed'
  | 'retrying'

/**
 * Options for AI analysis
 */
export interface AIAnalysisOptions {
  /** Skip cache and force fresh analysis */
  skipCache?: boolean
  /** Custom prompt additions (legacy - use customSummaryPrompt/customTaskPrompt) */
  customPrompt?: string
  /** Custom summary prompt template */
  customSummaryPrompt?: string
  /** Custom task detection prompt */
  customTaskPrompt?: string
  /** Source type for context-aware prompts */
  sourceType?: string
  /** Maximum number of tasks to detect */
  maxTasks?: number
  /** Available domains for domain detection (e.g., ['design', 'frontend', 'backend']) */
  availableDomains?: string[]
}

/**
 * Cache entry structure
 */
export interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

/**
 * Service error with retry metadata
 */
export interface ServiceError extends Error {
  code?: string
  statusCode?: number
  retryable?: boolean
  retryAfter?: number
}

/**
 * Configuration for Notion task creation
 */
export interface NotionTaskConfig {
  /** Notion database ID (without dashes) */
  databaseId: string
  /** Optional API key override (uses runtime config if not provided) */
  apiKey?: string
  /** Source type for metadata (e.g., 'Figma', 'Slack') */
  sourceType: string
  /** Deep link URL back to source discussion */
  sourceUrl: string
}

/**
 * Result of Notion task creation
 */
export interface NotionTaskResult {
  /** Notion page ID */
  id: string
  /** Public URL to the Notion page */
  url: string
  /** Creation timestamp */
  createdAt: Date
}

/**
 * Configuration for Notion input source
 * Stored in FlowInput.sourceMetadata or similar
 */
export interface NotionInputConfig {
  /** Notion API token */
  notionToken: string
  /** Trigger keyword for discussion detection (default: '@discubot', configurable per flow) */
  triggerKeyword: string
  /** Optional workspace ID for display/organization purposes */
  workspaceId?: string
}

// ============================================================================
// ADAPTER TYPES
// ============================================================================

/**
 * Parsed discussion from incoming webhook/email
 * This is the standardized format that all adapters output
 */
export interface ParsedDiscussion {
  /** Source type (e.g., 'figma', 'slack', 'linear') */
  sourceType: string
  /** Unique thread ID in source system */
  sourceThreadId: string
  /** Deep link URL to discussion in source */
  sourceUrl: string
  /** Resolved team ID */
  teamId: string
  /** User handle who created the discussion */
  authorHandle: string
  /** Discussion title or subject */
  title: string
  /** Main content/body */
  content: string
  /** List of participant handles */
  participants: string[]
  /** Creation timestamp */
  timestamp: Date
  /** Source-specific metadata */
  metadata: Record<string, any>
}

/**
 * Source configuration from the configs collection (LEGACY - replaced by Flow)
 * Contains API keys and settings for a specific source
 *
 * @deprecated Use Flow types (Flow, FlowInput, FlowOutput) instead
 */
export interface SourceConfig {
  /** Config record ID */
  id: string
  /** Team ID this config belongs to */
  teamId: string
  /** Source type (e.g., 'figma', 'slack') */
  sourceType: string
  /** Display name for this configuration */
  name: string
  /** Source API token/key */
  apiToken: string
  /** Notion API token */
  notionToken: string
  /** Notion database ID (without dashes) */
  notionDatabaseId: string
  /** Optional Anthropic API key override */
  anthropicApiKey?: string
  /** Whether AI analysis is enabled */
  aiEnabled: boolean
  /** Whether auto-sync is enabled */
  autoSync: boolean
  /** Source-specific settings (e.g., Slack workspace ID) */
  settings: Record<string, any>
  /** Source-specific metadata (e.g., Slack bot user ID, team IDs) */
  sourceMetadata?: Record<string, any>
  /** AI summary prompt override */
  aiSummaryPrompt?: string
  /** AI task detection prompt override */
  aiTaskPrompt?: string
  /** Notion field mapping configuration */
  notionFieldMapping?: Record<string, any>
  /** Webhook URL for receiving events */
  webhookUrl?: string
  /** Whether this config is active */
  active: boolean
}

// ============================================================================
// FLOW TYPES (v2 Architecture)
// ============================================================================

/**
 * Flow - Multi-input/multi-output configuration with AI domain routing
 *
 * Replaces the old single-input/single-output SourceConfig architecture.
 * One flow can have multiple inputs (Slack + Figma) and multiple outputs
 * (different Notion DBs, GitHub, Linear) with AI-based domain routing.
 */
export interface Flow {
  /** Flow record ID */
  id: string
  /** Team ID this flow belongs to */
  teamId: string
  /** Display name for this flow */
  name: string
  /** Description of what this flow handles */
  description?: string
  /** Available domains for AI routing (e.g., ['design', 'frontend', 'backend', 'product']) */
  availableDomains?: string[]
  /** Whether AI analysis is enabled */
  aiEnabled: boolean
  /** Optional Anthropic API key override */
  anthropicApiKey?: string
  /** AI summary prompt override */
  aiSummaryPrompt?: string
  /** AI task detection prompt override */
  aiTaskPrompt?: string
  /** Reply personality - preset key (e.g., 'friendly') or 'custom:...' for AI prompt */
  replyPersonality?: string
  /** Custom icon for personality - emoji (🤖), lucide icon (i-lucide-bot), or SVG data URL */
  personalityIcon?: string
  /** Whether onboarding is complete */
  onboardingComplete?: boolean
  /** Whether this flow is active */
  active: boolean
  /** Creation metadata */
  createdAt?: Date
  createdBy?: string
  updatedAt?: Date
  updatedBy?: string
}

/**
 * FlowInput - Single input source for a flow
 *
 * Connects external sources (Slack, Figma, email) to a flow.
 * A flow can have multiple inputs.
 */
export interface FlowInput {
  /** Input record ID */
  id: string
  /** Flow ID this input belongs to */
  flowId: string
  /** Source type (e.g., 'slack', 'figma', 'email') */
  sourceType: string
  /** Display name for this input */
  name: string
  /** Source API token/key */
  apiToken?: string
  /** Webhook URL for receiving events */
  webhookUrl?: string
  /** Webhook secret for validation */
  webhookSecret?: string
  /** Email address for email-based inputs (Resend) */
  emailAddress?: string
  /** Email slug for routing (e.g., 'figma-comments') */
  emailSlug?: string
  /** Source-specific metadata (e.g., Slack team ID, workspace name) */
  sourceMetadata?: Record<string, any>
  /** Whether this input is active */
  active: boolean
  /** Creation metadata */
  createdAt?: Date
  createdBy?: string
  updatedAt?: Date
  updatedBy?: string
}

/**
 * FlowOutput - Single output destination for a flow
 *
 * Defines where tasks should be created (Notion, GitHub, Linear).
 * A flow can have multiple outputs with domain-based routing.
 */
export interface FlowOutput {
  /** Output record ID */
  id: string
  /** Flow ID this output belongs to */
  flowId: string
  /** Output type (e.g., 'notion', 'github', 'linear') */
  outputType: string
  /** Display name for this output */
  name: string
  /** Domain filter - tasks matching these domains will be routed here */
  domainFilter?: string[]
  /** Whether this is the default output (for tasks with no/null domain) */
  isDefault: boolean
  /** Output-specific configuration (API keys, database IDs, field mappings, etc.) */
  outputConfig: Record<string, any>
  /** Whether this output is active */
  active: boolean
  /** Creation metadata */
  createdAt?: Date
  createdBy?: string
  updatedAt?: Date
  updatedBy?: string
}

/**
 * Output configuration for Notion outputs
 * Stored in FlowOutput.outputConfig
 */
export interface NotionOutputConfig {
  /** Notion API token */
  notionToken: string
  /** Notion database ID (without dashes) */
  databaseId: string
  /** Notion field mapping configuration */
  fieldMapping?: Record<string, any>
}

/**
 * Result of configuration validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean
  /** Validation errors (if any) */
  errors: string[]
  /** Validation warnings (if any) */
  warnings: string[]
}

/**
 * Retry options for operations
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number
  /** Initial delay in milliseconds */
  initialDelay?: number
  /** Maximum delay in milliseconds */
  maxDelay?: number
  /** Backoff multiplier (default: 2 for exponential) */
  backoffMultiplier?: number
}
