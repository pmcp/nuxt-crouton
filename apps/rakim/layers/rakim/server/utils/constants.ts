/**
 * System Constants for Discubot
 *
 * These constants are used throughout the Discubot layer for automated operations
 * that don't have a specific user context (e.g., webhook processing, scheduled jobs).
 */

/**
 * System user ID used for automated operations
 *
 * This ID is used as the `owner`, `createdBy`, and `updatedBy` field value
 * when records are created or updated by automated processes rather than
 * specific users.
 *
 * Examples:
 * - Processing discussions from webhooks
 * - Creating Notion tasks via processor
 * - Updating job statuses
 * - Retry operations
 */
export const SYSTEM_USER_ID = 'system'
