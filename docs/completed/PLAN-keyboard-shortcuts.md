# Keyboard Shortcuts Implementation Plan

## Overview

Add keyboard shortcuts to `@friendlyinternet/nuxt-crouton` core package to improve power-user experience and accessibility.

---

## Motivation

- Power users expect keyboard navigation in admin interfaces
- Reduces mouse usage for repetitive actions
- Improves accessibility
- Standard in modern admin tools (Notion, Linear, Vercel Dashboard)

---

## Dependencies

**Already available in nuxt-crouton:**
- `@vueuse/core` - provides `useMagicKeys`, `whenever`

**No new dependencies required.**

---

## API Design

### Composable: `useCroutonShortcuts`

```typescript
interface ShortcutConfig {
  create: string      // Open create form
  save: string        // Submit current form
  close: string       // Close current form/modal
  delete: string      // Delete selected items
  search: string      // Focus search input
  escape: string      // Generic escape/cancel
}

interface UseCroutonShortcutsOptions {
  /** Collection name for CRUD operations */
  collection: string
  
  /** Override default key bindings */
  shortcuts?: Partial<ShortcutConfig>
  
  /** Disable all shortcuts (e.g., when typing in input) */
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

interface UseCroutonShortcutsReturn {
  /** Current shortcut configuration */
  shortcuts: ShortcutConfig
  
  /** Format shortcut for display (e.g., "⌘N" on Mac, "Ctrl+N" on Windows) */
  formatShortcut: (action: keyof ShortcutConfig) => string
  
  /** Temporarily disable shortcuts */
  pause: () => void
  
  /** Re-enable shortcuts */
  resume: () => void
  
  /** Whether shortcuts are currently active */
  isActive: Ref<boolean>
}
```

### Default Shortcuts

| Action | Mac | Windows/Linux | Notes |
|--------|-----|---------------|-------|
| Create | `⌘ N` | `Ctrl+N` | Only when no form is open |
| Save | `⌘ S` | `Ctrl+S` | Only when form is open, prevents browser save |
| Close | `Escape` | `Escape` | Closes topmost form/modal |
| Delete | `⌘ Backspace` | `Ctrl+Backspace` | Only with selection, shows confirmation |
| Search | `⌘ K` or `/` | `Ctrl+K` or `/` | Focus search input |

---

## Implementation

### File: `packages/nuxt-crouton/app/composables/useCroutonShortcuts.ts`

```typescript
import { ref, computed, toValue, watch } from 'vue'
import { useMagicKeys, whenever, useActiveElement } from '@vueuse/core'
import type { MaybeRef, Ref } from 'vue'

// Types
export interface ShortcutConfig {
  create: string
  save: string
  close: string
  delete: string
  search: string
}

export interface UseCroutonShortcutsOptions {
  collection: string
  shortcuts?: Partial<ShortcutConfig>
  disabled?: MaybeRef<boolean>
  selected?: Ref<string[]>
  searchRef?: Ref<HTMLInputElement | null>
  handlers?: {
    onSave?: () => void | Promise<void>
    onDelete?: (ids: string[]) => void | Promise<void>
    onCreate?: () => void
  }
}

export interface UseCroutonShortcutsReturn {
  shortcuts: ShortcutConfig
  formatShortcut: (action: keyof ShortcutConfig) => string
  pause: () => void
  resume: () => void
  isActive: Ref<boolean>
}

// Platform detection
const isMac = typeof navigator !== 'undefined' 
  ? navigator.platform.toUpperCase().indexOf('MAC') >= 0 
  : false

// Default shortcuts using VueUse key format
const DEFAULT_SHORTCUTS: ShortcutConfig = {
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
  const { open, close, showCrouton, activeCollection } = useCrouton()
  const keys = useMagicKeys()
  const activeElement = useActiveElement()
  
  // Merge with defaults
  const shortcuts: ShortcutConfig = {
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
  whenever(
    () => keys[shortcuts.create]?.value,
    () => {
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
  whenever(
    () => keys[shortcuts.save]?.value,
    (pressed) => {
      if (!pressed) return
      if (!shouldHandle(true)) return
      if (!showCrouton.value) return // Only when form is open
      
      // Prevent browser save dialog
      const event = window.event as KeyboardEvent | undefined
      event?.preventDefault()
      
      options.handlers?.onSave?.()
    }
  )

  // CLOSE - Close current form
  whenever(
    () => keys[shortcuts.close]?.value,
    () => {
      if (!isActive.value) return
      if (showCrouton.value) {
        close()
      }
    }
  )

  // DELETE - Delete selected items
  whenever(
    () => keys[shortcuts.delete]?.value,
    () => {
      if (!shouldHandle(false)) return
      if (showCrouton.value) return // Don't delete while in form
      
      const ids = options.selected?.value
      if (!ids?.length) return
      
      options.handlers?.onDelete?.(ids)
    }
  )

  // SEARCH - Focus search input
  whenever(
    () => keys[shortcuts.search]?.value,
    () => {
      if (!shouldHandle(false)) return
      
      // Prevent browser default (Chrome address bar)
      const event = window.event as KeyboardEvent | undefined
      event?.preventDefault()
      
      options.searchRef?.value?.focus()
    }
  )
  
  // Also support "/" for search (common pattern)
  whenever(
    () => keys['/']?.value,
    () => {
      if (!shouldHandle(false)) return
      if (isTyping.value) return // Don't trigger when typing
      options.searchRef?.value?.focus()
    }
  )

  // ============ Utilities ============

  function formatShortcut(action: keyof ShortcutConfig): string {
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
```

---

## Component: `CroutonShortcutHint`

A small component to display keyboard shortcut hints in buttons/UI.

### File: `packages/nuxt-crouton/app/components/ShortcutHint.vue`

```vue
<script setup lang="ts">
interface Props {
  /** The shortcut string to display */
  shortcut: string
  /** Show in a muted/subtle style */
  subtle?: boolean
}

defineProps<Props>()
</script>

<template>
  <span 
    class="crouton-shortcut-hint"
    :class="{ 'crouton-shortcut-hint--subtle': subtle }"
  >
    <kbd 
      v-for="(key, index) in shortcut.split(/(?=[A-Z⌘⌥⇧⌫↵])|(?<=\+)/)" 
      :key="index"
      class="crouton-kbd"
    >
      {{ key.replace('+', '') }}
    </kbd>
  </span>
</template>

<style scoped>
.crouton-shortcut-hint {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 8px;
}

.crouton-shortcut-hint--subtle {
  opacity: 0.5;
}

.crouton-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 4px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  font-weight: 500;
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  border-radius: 4px;
}
</style>
```

---

## Integration with Existing Components

### Option A: Auto-enable in `CroutonTable`

Add optional shortcuts prop to `CroutonTable.vue`:

```vue
<script setup lang="ts">
interface Props {
  // ... existing props
  shortcuts?: boolean | Partial<ShortcutConfig>
}

const props = withDefaults(defineProps<Props>(), {
  shortcuts: false
})

// If shortcuts enabled, set them up
if (props.shortcuts) {
  const searchRef = ref<HTMLInputElement | null>(null)
  
  useCroutonShortcuts({
    collection: props.collection,
    shortcuts: typeof props.shortcuts === 'object' ? props.shortcuts : undefined,
    selected: selectedRows,
    searchRef,
    handlers: {
      onDelete: (ids) => {
        // Could open delete confirmation or emit event
        emit('delete', ids)
      }
    }
  })
}
</script>
```

### Option B: Keep Composable-Only (Recommended)

Let users opt-in explicitly in their pages. More flexible, less magic.

---

## Usage Examples

### Basic Usage

```vue
<script setup lang="ts">
const selected = ref<string[]>([])
const searchRef = ref<HTMLInputElement | null>(null)
const { items } = await useCollectionQuery('posts')
const { deleteItems } = useCollectionMutation('posts')

const { formatShortcut } = useCroutonShortcuts({
  collection: 'posts',
  selected,
  searchRef,
  handlers: {
    onDelete: async (ids) => {
      if (confirm(`Delete ${ids.length} items?`)) {
        await deleteItems(ids)
        selected.value = []
      }
    }
  }
})
</script>

<template>
  <div>
    <div class="flex justify-between mb-4">
      <UInput ref="searchRef" placeholder="Search..." />
      
      <UButton @click="open('create', 'posts')">
        New Post
        <CroutonShortcutHint :shortcut="formatShortcut('create')" subtle />
      </UButton>
    </div>
    
    <CroutonCollection
      v-model:selected="selected"
      :rows="items"
      collection="posts"
      selectable
    />
  </div>
</template>
```

### Custom Shortcuts

```vue
<script setup lang="ts">
useCroutonShortcuts({
  collection: 'posts',
  shortcuts: {
    create: 'Meta+Shift+n',  // Override default
    search: 'Meta+f',        // Use Cmd+F instead
  }
})
</script>
```

### With Form Save Handler

```vue
<script setup lang="ts">
// In a form component
const formRef = ref()

useCroutonShortcuts({
  collection: 'posts',
  handlers: {
    onSave: () => {
      // Trigger form submission
      formRef.value?.submit()
    }
  }
})
</script>

<template>
  <UForm ref="formRef" @submit="handleSubmit">
    <!-- form fields -->
  </UForm>
</template>
```

### Disable During Modal

```vue
<script setup lang="ts">
const isCustomModalOpen = ref(false)

useCroutonShortcuts({
  collection: 'posts',
  disabled: isCustomModalOpen, // Pause shortcuts while custom modal is open
})
</script>
```

---

## Accessibility Considerations

1. **Screen readers**: Shortcut hints use `<kbd>` element for semantic meaning
2. **Focus management**: Escape only closes when focus is within the modal
3. **Conflicts**: Check for conflicts with assistive technology shortcuts
4. **Documentation**: Consider adding a "Keyboard shortcuts" help modal (? key)

---

## Future Enhancements

### Phase 2: Shortcuts Help Modal

Press `?` to show a modal listing all available shortcuts.

```typescript
// Additional shortcut
whenever(keys['Shift+/'], () => {
  showShortcutsHelp.value = true
})
```

### Phase 3: Customizable via App Config

```typescript
// app.config.ts
export default defineAppConfig({
  crouton: {
    shortcuts: {
      enabled: true,
      bindings: {
        create: 'Meta+n',
        // ...
      }
    }
  }
})
```

### Phase 4: Navigation Shortcuts

- `j/k` - Move selection up/down in table
- `Enter` - Open selected item
- `g then h` - Go to home (vim-style sequences)

---

## Testing Plan

1. **Unit tests** for `useCroutonShortcuts` composable
2. **E2E tests** with Playwright:
   - Press Cmd+N → form opens
   - Press Escape → form closes
   - Press Cmd+S in form → form submits
   - Shortcuts disabled when typing in input
3. **Cross-browser testing**: Chrome, Firefox, Safari
4. **Cross-platform testing**: Mac, Windows, Linux key mappings

---

## Migration / Breaking Changes

None - this is a new additive feature. Existing code continues to work.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `app/composables/useCroutonShortcuts.ts` | Create |
| `app/components/ShortcutHint.vue` | Create |
| `app/composables/index.ts` | Export new composable |
| `README.md` | Document new feature |

---

## Estimated Effort

- Implementation: 2-3 hours
- Testing: 1-2 hours
- Documentation: 1 hour

**Total: ~4-6 hours**
