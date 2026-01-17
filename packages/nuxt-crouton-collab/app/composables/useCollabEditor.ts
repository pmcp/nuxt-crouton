import * as Y from 'yjs'
import { computed, type Ref, type ComputedRef } from 'vue'
import { useCollabSync } from './useCollabSync'
import { useCollabPresence } from './useCollabPresence'
import type { CollabAwarenessState, CollabUser } from '../types/collab'

export interface UseCollabEditorOptions {
  /** Unique room identifier */
  roomId: string
  /** Room type (default: 'page') */
  roomType?: string
  /** Field name for the editor content (default: 'content') */
  field?: string
  /** User info for presence (auto-detected if not provided) */
  user?: { name: string; color?: string }
}

/**
 * Awareness-like interface compatible with TipTap Collaboration extension
 */
export interface CollabAwareness {
  setLocalStateField: (field: string, value: unknown) => void
  getLocalState: () => Record<string, unknown> | null
  on: (event: 'change', callback: () => void) => void
  off: (event: 'change', callback: () => void) => void
}

/**
 * Provider interface compatible with TipTap Collaboration extension
 */
export interface CollabProvider {
  awareness: CollabAwareness
}

export interface UseCollabEditorReturn {
  // Connection state
  connected: ComputedRef<boolean>
  synced: ComputedRef<boolean>
  error: ComputedRef<Error | null>

  // Yjs for TipTap
  ydoc: Y.Doc
  yxmlFragment: Y.XmlFragment

  // Presence
  user: ComputedRef<CollabUser | null>
  users: Ref<CollabAwarenessState[]>
  otherUsers: ComputedRef<CollabAwarenessState[]>

  // For TipTap Collaboration extension
  provider: CollabProvider

  // Actions
  connect: () => void
  disconnect: () => void
  updateCursor: (cursor: { x: number; y: number } | null) => void
  updateSelection: (selection: { anchor: number; head: number } | null) => void
}

/**
 * Composable for TipTap editor collaboration
 *
 * Provides a ready-to-use setup for collaborative rich text editing with TipTap.
 * Includes Yjs document, XmlFragment, and presence awareness.
 *
 * @example
 * ```ts
 * const {
 *   ydoc,
 *   yxmlFragment,
 *   provider,
 *   connected,
 *   users
 * } = useCollabEditor({
 *   roomId: 'page-123',
 *   user: { name: 'Alice' }
 * })
 *
 * // Use with TipTap
 * import { Collaboration } from '@tiptap/extension-collaboration'
 * import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor'
 *
 * const editor = useEditor({
 *   extensions: [
 *     Collaboration.configure({
 *       document: ydoc,
 *       field: 'content'
 *     }),
 *     CollaborationCursor.configure({
 *       provider,
 *       user: { name: 'Alice', color: '#ff0000' }
 *     })
 *   ]
 * })
 * ```
 */
export function useCollabEditor(options: UseCollabEditorOptions): UseCollabEditorReturn {
  const {
    roomId,
    roomType = 'page',
    field = 'content',
    user: providedUser
  } = options

  // Use useCollabSync with xmlFragment structure
  const sync = useCollabSync({
    roomId,
    roomType,
    structure: 'xmlFragment',
    structureName: field
  })

  const { ydoc, yxmlFragment, connected, synced, error, connection, users, connect, disconnect } = sync

  if (!yxmlFragment) {
    throw new Error('[useCollabEditor] Failed to create Y.XmlFragment')
  }

  // Use presence for cursor tracking
  const presence = useCollabPresence({
    connection,
    user: providedUser
  })

  const { user, otherUsers, updateCursor, updateSelection } = presence

  // Local state for awareness (TipTap compatibility)
  const localState: Record<string, unknown> = {}
  const changeCallbacks: (() => void)[] = []

  /**
   * Create a TipTap-compatible provider with awareness interface
   */
  const provider: CollabProvider = {
    awareness: {
      /**
       * Set a local state field (called by TipTap CollaborationCursor)
       */
      setLocalStateField(stateField: string, value: unknown): void {
        localState[stateField] = value

        // If setting cursor/selection, update presence
        if (stateField === 'cursor' && value && typeof value === 'object') {
          const cursor = value as { anchor?: number; head?: number }
          if (typeof cursor.anchor === 'number' && typeof cursor.head === 'number') {
            updateSelection({ anchor: cursor.anchor, head: cursor.head })
          }
        }

        // Notify listeners
        for (const callback of changeCallbacks) {
          callback()
        }
      },

      /**
       * Get current local state
       */
      getLocalState(): Record<string, unknown> | null {
        if (Object.keys(localState).length === 0) return null
        return { ...localState }
      },

      /**
       * Subscribe to state changes
       */
      on(event: 'change', callback: () => void): void {
        if (event === 'change') {
          changeCallbacks.push(callback)
        }
      },

      /**
       * Unsubscribe from state changes
       */
      off(event: 'change', callback: () => void): void {
        if (event === 'change') {
          const index = changeCallbacks.indexOf(callback)
          if (index !== -1) {
            changeCallbacks.splice(index, 1)
          }
        }
      }
    }
  }

  return {
    // Connection state
    connected,
    synced,
    error,

    // Yjs for TipTap
    ydoc,
    yxmlFragment,

    // Presence
    user,
    users,
    otherUsers,

    // For TipTap Collaboration extension
    provider,

    // Actions
    connect,
    disconnect,
    updateCursor,
    updateSelection
  }
}
