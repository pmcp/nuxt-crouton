/**
 * useCroutonShortcuts - Keyboard shortcuts for CRUD operations
 *
 * Provides keyboard shortcuts for power users to quickly navigate
 * and perform actions in Crouton-based admin interfaces.
 *
 * Uses VueUse's useMagicKeys for cross-browser key detection.
 */

import { ref, computed, toValue, watch } from 'vue'
import { useMagicKeys, useActiveElement } from '@vueuse/core'
import type { MaybeRef, Ref } from 'vue'
import useCrouton from './useCrouton'

// Types
export interface CroutonShortcutConfig {
  create: string
  save: string
  close: string
  delete: string
  search: string
}

export interface UseCroutonShortcutsOptions {
  /** Collection name for CRUD operations */
  collection: string

  /** Override default key bindings */
  shortcuts?: Partial<CroutonShortcutConfig>

  /** Disable all shortcuts (e.g., when custom modal is open) */
  disabled?: MaybeRef<boolean>

  /** Selected item IDs for bulk operations */
  selected?: Ref<string[]>

  /** Reference to search input for focus */
  searchRef?: Ref<HTMLInputElement | null>

  /** Custom action handlers */
  handlers?: {
    onSave?: () => void | Promise<void>
    onDelete?: (ids: string[]) => void | Promise<void>
    onCreate?: () => void
  }
}

export interface UseCroutonShortcutsReturn {
  /** Current shortcut configuration */
  shortcuts: CroutonShortcutConfig

  /** Format shortcut for display (e.g., "⌘N" on Mac, "Ctrl+N" on Windows) */
  formatShortcut: (action: keyof CroutonShortcutConfig) => string

  /** Temporarily disable shortcuts */
  pause: () => void

  /** Re-enable shortcuts */
  resume: () => void

  /** Whether shortcuts are currently active */
  isActive: Ref<boolean>
}

// Platform detection (SSR-safe)
const isMac = import.meta.client
  ? navigator.platform.toUpperCase().includes('MAC')
  : false

// Default shortcuts using VueUse key format
const DEFAULT_SHORTCUTS: CroutonShortcutConfig = {
  create: isMac ? 'Meta+n' : 'Control+n',
  save: isMac ? 'Meta+s' : 'Control+s',
  close: 'Escape',
  delete: isMac ? 'Meta+Backspace' : 'Control+Backspace',
  search: isMac ? 'Meta+k' : 'Control+k',
}

// Format for display
const KEY_SYMBOLS: Record<string, string> = {
  Meta: '⌘',
  Control: 'Ctrl',
  Alt: '⌥',
  Shift: '⇧',
  Backspace: '⌫',
  Escape: 'Esc',
  Enter: '↵',
}

export function useCroutonShortcuts(
  options: UseCroutonShortcutsOptions
): UseCroutonShortcutsReturn {
  const { open, close, showCrouton } = useCrouton()
  const keys = useMagicKeys()
  const activeElement = useActiveElement()

  // Merge with defaults
  const shortcuts: CroutonShortcutConfig = {
    ...DEFAULT_SHORTCUTS,
    ...options.shortcuts,
  }

  // Pause/resume state
  const isPaused = ref(false)

  // Check if we should ignore shortcuts (typing in input)
  const isTyping = computed(() => {
    const el = activeElement.value
    if (!el) return false
    const tag = el.tagName.toLowerCase()
    const isEditable = el.getAttribute('contenteditable') === 'true'
    return tag === 'input' || tag === 'textarea' || isEditable
  })

  // Combined active state
  const isActive = computed(() => {
    if (isPaused.value) return false
    if (toValue(options.disabled)) return false
    return true
  })

  // Should we handle this shortcut?
  const shouldHandle = (allowInForm = false) => {
    if (!isActive.value) return false
    // Some shortcuts (like save, close) work in forms
    // Others (like create, delete) only work outside forms
    if (!allowInForm && isTyping.value) return false
    return true
  }

  // ============ Shortcut Handlers ============

  // CREATE - Open new form
  watch(
    () => keys[shortcuts.create]?.value,
    (pressed: boolean | undefined) => {
      if (!pressed) return
      if (!shouldHandle(false)) return
      if (showCrouton.value) return // Don't open if form already open

      if (options.handlers?.onCreate) {
        options.handlers.onCreate()
      } else {
        open('create', options.collection)
      }
    }
  )

  // SAVE - Submit current form
  watch(
    () => keys[shortcuts.save]?.value,
    (pressed: boolean | undefined) => {
      if (!pressed) return
      if (!shouldHandle(true)) return
      if (!showCrouton.value) return // Only when form is open

      // Prevent browser save dialog
      if (import.meta.client) {
        const event = window.event as KeyboardEvent | undefined
        event?.preventDefault()
      }

      options.handlers?.onSave?.()
    }
  )

  // CLOSE - Close current form
  watch(
    () => keys[shortcuts.close]?.value,
    (pressed: boolean | undefined) => {
      if (!pressed) return
      if (!isActive.value) return
      if (showCrouton.value) {
        close()
      }
    }
  )

  // DELETE - Delete selected items
  watch(
    () => keys[shortcuts.delete]?.value,
    (pressed: boolean | undefined) => {
      if (!pressed) return
      if (!shouldHandle(false)) return
      if (showCrouton.value) return // Don't delete while in form

      const ids = options.selected?.value
      if (!ids?.length) return

      options.handlers?.onDelete?.(ids)
    }
  )

  // SEARCH - Focus search input (Cmd/Ctrl+K)
  watch(
    () => keys[shortcuts.search]?.value,
    (pressed: boolean | undefined) => {
      if (!pressed) return
      if (!shouldHandle(false)) return

      // Prevent browser default (Chrome address bar)
      if (import.meta.client) {
        const event = window.event as KeyboardEvent | undefined
        event?.preventDefault()
      }

      options.searchRef?.value?.focus()
    }
  )

  // Also support "/" for search (common pattern)
  watch(
    () => keys['/']?.value,
    (pressed: boolean | undefined) => {
      if (!pressed) return
      if (!shouldHandle(false)) return
      if (isTyping.value) return // Don't trigger when typing
      options.searchRef?.value?.focus()
    }
  )

  // ============ Utilities ============

  function formatShortcut(action: keyof CroutonShortcutConfig): string {
    const shortcut = shortcuts[action]
    return shortcut
      .split('+')
      .map(key => KEY_SYMBOLS[key] || key.toUpperCase())
      .join(isMac ? '' : '+')
  }

  function pause() {
    isPaused.value = true
  }

  function resume() {
    isPaused.value = false
  }

  return {
    shortcuts,
    formatShortcut,
    pause,
    resume,
    isActive,
  }
}

export default useCroutonShortcuts
