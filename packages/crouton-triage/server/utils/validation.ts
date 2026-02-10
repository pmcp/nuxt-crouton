/**
 * Input Validation Schemas
 *
 * Provides:
 * - Zod schemas for validating API inputs
 * - Type-safe validation with error messages
 * - Reusable validation helpers
 *
 * Security benefits:
 * - Prevents injection attacks through strict type validation
 * - Enforces data constraints (length, format, etc.)
 * - Provides clear error messages for debugging
 */

import { z } from 'zod'

/**
 * Common validation patterns
 */

// Email validation
export const emailSchema = z.string().email('Invalid email address')

// URL validation
export const urlSchema = z.string().url('Invalid URL')

// Team ID validation (slug format)
export const teamIdSchema = z.string()
  .min(1, 'Team ID is required')
  .max(100, 'Team ID too long')
  .regex(/^[a-z0-9-]+$/, 'Team ID must contain only lowercase letters, numbers, and hyphens')

// Source type validation
export const sourceTypeSchema = z.enum(['figma', 'slack'], {
  errorMap: () => ({ message: 'Source type must be "figma" or "slack"' }),
})

// Discussion status validation
export const discussionStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed'], {
  errorMap: () => ({ message: 'Invalid discussion status' }),
})

// Job status validation
export const jobStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed', 'retrying'], {
  errorMap: () => ({ message: 'Invalid job status' }),
})

/**
 * Slack webhook payload validation
 */
export const slackEventSchema = z.object({
  type: z.literal('event_callback'),
  team_id: z.string().min(1),
  event: z.object({
    type: z.literal('app_mention'),
    channel: z.string().min(1),
    user: z.string().min(1),
    text: z.string().min(1),
    ts: z.string().min(1),
    thread_ts: z.string().optional(),
  }),
})

export const slackUrlVerificationSchema = z.object({
  type: z.literal('url_verification'),
  challenge: z.string().min(1),
})

/**
 * Mailgun webhook payload validation
 */
export const mailgunPayloadSchema = z.object({
  recipient: z.string().min(1, 'Recipient is required'),
  from: z.string().optional(),
  subject: z.string().optional(),
  'body-plain': z.string().optional(),
  'body-html': z.string().optional(),
  'stripped-text': z.string().optional(),
  timestamp: z.number().optional(),
  signature: z.object({
    timestamp: z.union([z.string(), z.number()]),
    token: z.string(),
    signature: z.string(),
  }).optional(),
}).refine(
  (data) => data['body-plain'] || data['body-html'] || data['stripped-text'],
  {
    message: 'At least one email body field is required',
  },
)

/**
 * Source config validation
 */
export const sourceConfigSchema = z.object({
  name: z.string().min(1, 'Config name is required').max(200),
  teamId: teamIdSchema,
  sourceType: sourceTypeSchema,
  isActive: z.boolean().default(true),

  // Figma-specific fields
  recipientEmail: z.string().email().optional(),

  // Slack-specific fields
  webhookUrl: z.string().url().optional(),
  slackTeamId: z.string().optional(),

  // Common fields
  notionDatabaseId: z.string().min(1, 'Notion database ID is required'),
  notionToken: z.string().min(1, 'Notion token is required'),
  anthropicApiKey: z.string().min(1, 'Anthropic API key is required'),

  // Optional fields
  notionFieldMapping: z.record(z.string()).optional(),
  sourceMetadata: z.record(z.any()).optional(),
  enableMultiTaskDetection: z.boolean().default(true),
  enableNotifications: z.boolean().default(false),
})

/**
 * Discussion retry request validation
 */
export const retryRequestSchema = z.object({
  skipAI: z.boolean().optional().default(false),
  skipNotion: z.boolean().optional().default(false),
})

/**
 * User mapping validation
 */
export const userMappingSchema = z.object({
  sourceType: sourceTypeSchema,
  sourceUserId: z.string().min(1, 'Source user ID is required'),
  sourceUserEmail: z.string().email().optional(),
  sourceUserName: z.string().optional(),
  notionUserId: z.string().min(1, 'Notion user ID is required'),
  notionUserName: z.string().optional(),
  notionUserEmail: z.string().email().optional(),
  mappingType: z.enum(['manual', 'auto-email', 'auto-name', 'imported']).default('manual'),
  confidence: z.number().min(0).max(1).default(1),
  isActive: z.boolean().default(true),
  teamId: teamIdSchema,
})

/**
 * Bulk user mapping import validation
 */
export const bulkUserMappingSchema = z.array(userMappingSchema).max(1000, 'Maximum 1000 mappings per import')

/**
 * Test connection request validation
 */
export const testConnectionSchema = z.object({
  // Test by ID (existing config)
  configId: z.string().optional(),

  // Test by config (new config before saving)
  config: z.object({
    sourceType: sourceTypeSchema,
    apiToken: z.string().optional(), // Figma or Slack token
    webhookUrl: z.string().url().optional(), // Slack webhook
    notionDatabaseId: z.string().min(1, 'Notion database ID is required'),
    notionToken: z.string().min(1, 'Notion token is required'),
  }).optional(),
}).refine(
  (data) => data.configId || data.config,
  {
    message: 'Either configId or config must be provided',
  },
)

/**
 * Notion users request validation
 */
export const notionUsersRequestSchema = z.object({
  notionToken: z.string().min(1, 'Notion token is required'),
  teamId: teamIdSchema,
})

/**
 * Helper function to validate and parse request body with Zod schema
 *
 * @param event - H3 event object
 * @param schema - Zod schema to validate against
 * @returns Parsed and validated data
 *
 * @example
 * ```ts
 * const data = await validateRequestBody(event, sourceConfigSchema)
 * // data is now type-safe and validated
 * ```
 */
export async function validateRequestBody<T extends z.ZodType>(
  event: any,
  schema: T,
): Promise<z.infer<T>> {
  try {
    const body = await readBody(event)
    return schema.parse(body)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation Error',
        data: {
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        },
      })
    }
    throw error
  }
}

/**
 * Helper function to validate query parameters
 *
 * @param event - H3 event object
 * @param schema - Zod schema to validate against
 * @returns Parsed and validated data
 *
 * @example
 * ```ts
 * const query = validateQuery(event, z.object({
 *   teamId: teamIdSchema,
 *   limit: z.coerce.number().min(1).max(100).default(10)
 * }))
 * ```
 */
export function validateQuery<T extends z.ZodType>(
  event: any,
  schema: T,
): z.infer<T> {
  try {
    const query = getQuery(event)
    return schema.parse(query)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation Error',
        data: {
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        },
      })
    }
    throw error
  }
}

/**
 * Sanitize string input to prevent XSS
 *
 * Removes potentially dangerous characters and HTML tags.
 * Use this for user-generated content that will be displayed.
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .trim()
    .substring(0, 10000) // Limit length to prevent DoS
}

/**
 * Sanitize object by recursively sanitizing all string values
 *
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result: any = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value)
    }
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeObject(value)
    }
    else {
      result[key] = value
    }
  }

  return result
}
