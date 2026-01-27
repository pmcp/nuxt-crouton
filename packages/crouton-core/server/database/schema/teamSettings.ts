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
 * Theme color options (Tailwind CSS colors)
 */
export type ThemePrimaryColor =
  | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green'
  | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo'
  | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose'

export type ThemeNeutralColor = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'

export type ThemeRadius = 0 | 0.125 | 0.25 | 0.375 | 0.5

/**
 * Theme settings for team visual customization
 * Similar to Nuxt UI's theme picker
 */
export interface TeamThemeSettings {
  /** Primary color for buttons, links, and accents */
  primary?: ThemePrimaryColor
  /** Neutral color for backgrounds, borders, and text */
  neutral?: ThemeNeutralColor
  /** Border radius in rem (0 = sharp corners, 0.5 = fully rounded) */
  radius?: ThemeRadius
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
  /**
   * Theme settings for team visual customization
   * Safe to expose to client - no sensitive data
   */
  themeSettings: text('theme_settings', { mode: 'json' }).$type<TeamThemeSettings>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$default(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(
    () => new Date()
  )
})
