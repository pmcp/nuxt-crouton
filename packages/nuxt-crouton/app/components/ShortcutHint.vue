<script setup lang="ts">
/**
 * ShortcutHint - Display keyboard shortcut badges
 *
 * Renders keyboard shortcuts as styled <kbd> elements.
 * Works with the formatShortcut() utility from useCroutonShortcuts.
 *
 * @example
 * <CroutonShortcutHint shortcut="⌘N" />
 * <CroutonShortcutHint :shortcut="formatShortcut('save')" subtle />
 */

interface Props {
  /** The shortcut string to display (e.g., "⌘N" or "Ctrl+S") */
  shortcut: string
  /** Show in a muted/subtle style */
  subtle?: boolean
}

defineProps<Props>()

// Split shortcut into individual keys for separate <kbd> elements
// Handles both Mac style (⌘S) and Windows style (Ctrl+S)
function splitShortcut(shortcut: string): string[] {
  // If it contains +, split by +
  if (shortcut.includes('+')) {
    return shortcut.split('+').filter(Boolean)
  }

  // Otherwise split by special characters (Mac symbols)
  const symbols = ['⌘', '⌥', '⇧', '⌃', '⌫', '↵']
  const result: string[] = []
  let remaining = shortcut

  for (const symbol of symbols) {
    if (remaining.includes(symbol)) {
      result.push(symbol)
      remaining = remaining.replace(symbol, '')
    }
  }

  // Add any remaining characters (the actual key)
  if (remaining.trim()) {
    result.push(remaining.trim())
  }

  return result
}
</script>

<template>
  <span
    class="inline-flex items-center gap-0.5 ml-2"
    :class="{ 'opacity-50': subtle }"
  >
    <kbd
      v-for="(key, index) in splitShortcut(shortcut)"
      :key="index"
      class="inline-flex items-center justify-center min-w-5 h-5 px-1 font-mono text-[11px] font-medium bg-(--ui-bg-muted) border border-(--ui-border) rounded"
    >
      {{ key }}
    </kbd>
  </span>
</template>
