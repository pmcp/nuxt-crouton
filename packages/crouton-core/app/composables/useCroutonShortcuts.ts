/**
 * useCroutonShortcuts - Keyboard shortcuts for CRUD operations
 *
 * Provides keyboard shortcuts for power users to quickly navigate
 * and perform actions in Crouton-based admin interfaces.
 *
 * Uses Nuxt UI's defineShortcuts for reliable cross-platform key detection.
 * Shortcuts automatically convert meta (⌘) to ctrl on non-Mac platforms.
 */

import { ref, computed, toValue } from 'vue'
import type { MaybeRef, Ref } from 'vue'
import useCrouton from './useCrouton'

// defineShortcuts is auto-imported from Nuxt UI

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

  /** Override default key bindings (use Nuxt UI format: meta_k, ctrl_shift_f) */
  shortcuts?: Partial<CroutonShortcutConfig>

  /** Disable all shortcuts (e.g., when custom modal is open) */
  disabled?: MaybeRef<boolean>

  /** Selected item IDs for bulk operations */
  selected?: Ref<string[]>

  /** Reference to search input for focus (can be HTMLInputElement or component ref like UInput) */
  searchRef?: Ref<HTMLInputElement | { $el?: HTMLElement } | null>

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

// Default shortcuts using Nuxt UI defineShortcuts format
// meta_ automatically converts to ctrl_ on non-Mac platforms
const DEFAULT_SHORTCUTS: CroutonShortcutConfig = {
  create: 'meta_n',
  save: 'meta_s',
  close: 'escape',
  delete: 'meta_backspace',
  search: 'meta_k',
}

// Format for display
const KEY_SYMBOLS: Record<string, string> = {
  meta: isMac ? '⌘' : 'Ctrl',
  ctrl: 'Ctrl',
  alt: '⌥',
  shift: '⇧',
  backspace: '⌫',
  escape: 'Esc',
  enter: '↵',
}

export function useCroutonShortcuts(
  options: UseCroutonShortcutsOptions
): UseCroutonShortcutsReturn {
  const { open, close, showCrouton } = useCrouton()

  // Merge with defaults
  const shortcuts: CroutonShortcutConfig = {
    ...DEFAULT_SHORTCUTS,
    ...options.shortcuts,
  }

  // Pause/resume state
  const isPaused = ref(false)

  // Combined active state
  const isActive = computed(() => {
    if (isPaused.value) return false
    if (toValue(options.disabled)) return false
    return true
  })

  // Build the shortcuts config for defineShortcuts
  const shortcutsConfig: Record<string, any> = {}

  // CREATE - Open new form (meta+n = ⌘N on Mac, Ctrl+N on Windows)
  shortcutsConfig[shortcuts.create] = {
    usingInput: false, // Don't trigger when typing
    handler: () => {
      if (!isActive.value) return
      if (showCrouton.value) return // Don't open if form already open

      if (options.handlers?.onCreate) {
        options.handlers.onCreate()
      } else {
        open('create', options.collection)
      }
    },
  }

  // SAVE - Submit current form (meta+s = ⌘S on Mac, Ctrl+S on Windows)
  shortcutsConfig[shortcuts.save] = {
    usingInput: true, // Allow while typing in form
    handler: () => {
      if (!isActive.value) return
      if (!showCrouton.value) return // Only when form is open

      options.handlers?.onSave?.()
    },
  }

  // CLOSE - Close current form (Escape)
  shortcutsConfig[shortcuts.close] = {
    usingInput: true, // Allow while typing
    handler: () => {
      if (!isActive.value) return
      if (!showCrouton.value) return

      close()
    },
  }

  // DELETE - Delete selected items (meta+backspace)
  shortcutsConfig[shortcuts.delete] = {
    usingInput: false, // Don't trigger when typing
    handler: () => {
      if (!isActive.value) return
      if (showCrouton.value) return // Don't delete while in form

      const ids = options.selected?.value
      if (!ids?.length) return

      options.handlers?.onDelete?.(ids)
    },
  }

  // Helper to focus search input (handles both raw input and component refs)
  const focusSearch = () => {
    const ref = options.searchRef?.value
    if (!ref) return

    // If it's an HTMLInputElement, focus directly
    if (ref instanceof HTMLInputElement) {
      ref.focus()
      return
    }

    // If it's a component ref (like UInput), find the input inside
    const el = ref.$el
    if (el) {
      const input = el.tagName === 'INPUT' ? el : el.querySelector('input')
      if (input instanceof HTMLInputElement) {
        input.focus()
      }
    }
  }

  // SEARCH - Focus search input (meta+k = ⌘K on Mac, Ctrl+K on Windows)
  shortcutsConfig[shortcuts.search] = {
    usingInput: false, // Don't trigger when already typing
    handler: () => {
      if (!isActive.value) return
      focusSearch()
    },
  }

  // SEARCH alternate - "/" key (common pattern like GitHub, Notion)
  shortcutsConfig['/'] = {
    usingInput: false, // Don't trigger when typing
    handler: () => {
      if (!isActive.value) return
      focusSearch()
    },
  }

  // Register all shortcuts with Nuxt UI
  defineShortcuts(shortcutsConfig)

  // ============ Utilities ============

  function formatShortcut(action: keyof CroutonShortcutConfig): string {
    const shortcut = shortcuts[action]
    return shortcut
      .split('_')
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
