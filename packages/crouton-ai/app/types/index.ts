/**
 * Core types for @crouton/ai
 */

/**
 * Represents a single message in an AI conversation
 */
export interface AIMessage {
  /** Unique identifier for the message */
  id: string
  /** The role of the message sender */
  role: 'user' | 'assistant' | 'system'
  /** The content of the message */
  content: string
  /** When the message was created */
  createdAt?: Date
}

/**
 * Configuration for an AI provider
 */
export interface AIProvider {
  /** Unique identifier for the provider */
  id: string
  /** Human-readable name */
  name: string
  /** List of available model IDs */
  models: string[]
}

/**
 * Model information with metadata
 */
export interface AIModel {
  /** Model identifier (e.g., 'gpt-4o', 'claude-sonnet-4-20250514') */
  id: string
  /** Human-readable name */
  name: string
  /** Description of the model capabilities */
  description?: string
}

/**
 * Options for the useChat composable
 */
export interface AIChatOptions {
  /** API endpoint for chat (default: '/api/ai/chat') */
  api?: string
  /** Unique identifier for the chat session */
  id?: string
  /** Provider to use (e.g., 'openai', 'anthropic') */
  provider?: string
  /** Model to use (e.g., 'gpt-4o', 'claude-sonnet-4-20250514') */
  model?: string
  /** System prompt to set context */
  systemPrompt?: string
  /** Initial messages to populate the chat */
  initialMessages?: AIMessage[]
  /** Initial input value */
  initialInput?: string
  /** Additional body parameters to send with each request */
  body?: Record<string, unknown>
  /** Additional headers to send with each request */
  headers?: Record<string, string> | Headers
  /** Credentials mode for fetch requests */
  credentials?: 'omit' | 'same-origin' | 'include'
  /** Callback when a message is complete */
  onFinish?: (message: AIMessage) => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
  /** Callback when a response is received */
  onResponse?: (response: Response) => void | Promise<void>
}

/**
 * Options for the useCompletion composable
 */
export interface AICompletionOptions {
  /** API endpoint for completion (default: '/api/ai/completion') */
  api?: string
  /** Unique identifier for the completion session */
  id?: string
  /** Provider to use (e.g., 'openai', 'anthropic') */
  provider?: string
  /** Model to use (e.g., 'gpt-4o', 'claude-sonnet-4-20250514') */
  model?: string
  /** Additional body parameters to send with each request */
  body?: Record<string, unknown>
  /** Additional headers to send with each request */
  headers?: Record<string, string> | Headers
  /** Credentials mode for fetch requests */
  credentials?: 'omit' | 'same-origin' | 'include'
  /** Callback when completion is finished */
  onFinish?: (completion: string) => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
  /** Callback when a response is received */
  onResponse?: (response: Response) => void | Promise<void>
}

/**
 * Configuration for AI providers with their API keys
 */
export interface AIProviderConfig {
  openai?: {
    apiKey?: string
    organization?: string
  }
  anthropic?: {
    apiKey?: string
  }
}

/**
 * Public runtime config for AI settings
 */
export interface CroutonAIPublicConfig {
  /** Default provider to use */
  defaultProvider: string
  /** Default model to use */
  defaultModel: string
}

/**
 * Props for the AIChatbox component
 */
export interface AIChatboxProps {
  /** API endpoint for chat */
  api?: string
  /** System prompt to set context */
  systemPrompt?: string
  /** Placeholder text for input */
  placeholder?: string
  /** Message shown when there are no messages */
  emptyMessage?: string
}

/**
 * Props for the AIMessage component
 */
export interface AIMessageProps {
  /** The message to display */
  message: AIMessage
  /** Whether this message is currently streaming */
  isStreaming?: boolean
}

/**
 * Props for the AIInput component
 */
export interface AIInputProps {
  /** Current input value */
  modelValue?: string
  /** Whether the input is in loading state */
  loading?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Whether the input is disabled */
  disabled?: boolean
}
