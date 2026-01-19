import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

/**
 * AI settings type for team-specific API keys and preferences
 * Keys are stored server-side only - never exposed to client
 */
export interface TeamAISettings {
  /** Anthropic API key (e.g., sk-ant-...) */
  anthropicApiKey?: string
  /** OpenAI API key (e.g., sk-...) */
  openaiApiKey?: string
  /** Default AI model for this team (e.g., claude-sonnet-4-20250514, gpt-4o) */
  defaultModel?: string
  /** Default AI provider: 'anthropic' | 'openai' */
  defaultProvider?: 'anthropic' | 'openai'
}

/**
 * Team settings table for translation overrides and AI configuration
 * This table stores team-specific settings that take precedence over system defaults
 */
export const teamSettings = sqliteTable('team_settings', {
  id: text('id')
    .primaryKey()
    .$default(() => nanoid()),
  teamId: text('team_id')
    .notNull()
    .unique(),
  translations: text('translations', { mode: 'json' }).$type<{
    [locale: string]: {
      [key: string]: string
    }
  }>(),
  /**
   * AI settings including API keys and preferences
   * SECURITY: This field is server-side only - never expose to client
   */
  aiSettings: text('ai_settings', { mode: 'json' }).$type<TeamAISettings>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$default(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(
    () => new Date()
  )
})
