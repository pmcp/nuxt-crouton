<template>
  <UEditorMentionMenu
    :editor="editor"
    :items="mentionItems"
    :char="char"
    plugin-key="variableMenu"
    :filter-fields="['label', 'description']"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EditorVariable, EditorVariableGroup } from '../types/editor'

interface Props {
  /** TipTap editor instance (required, passed from UEditor slot) */
  editor?: any
  /** Flat list of variables */
  variables?: EditorVariable[]
  /** Grouped variables (renders with group labels) */
  groups?: EditorVariableGroup[]
  /** Trigger character (default: "{{") */
  char?: string
}

const props = withDefaults(defineProps<Props>(), {
  char: '{{'
})

/**
 * Convert variables to UEditorMentionMenu format
 */
const mentionItems = computed(() => {
  // If groups provided, use grouped format
  if (props.groups?.length) {
    return props.groups.map(group => [
      // Group label (disabled item)
      {
        label: group.label,
        disabled: true
      },
      // Group items
      ...group.variables.map(v => ({
        label: v.name,
        description: v.description || v.label,
        icon: v.icon || 'i-lucide-braces'
      }))
    ])
  }

  // Flat list of variables
  if (props.variables?.length) {
    // Check if variables have categories - if so, group them
    const hasCategories = props.variables.some(v => v.category)

    if (hasCategories) {
      // Group by category
      const grouped = new Map<string, EditorVariable[]>()

      for (const variable of props.variables) {
        const category = variable.category || 'Other'
        if (!grouped.has(category)) {
          grouped.set(category, [])
        }
        grouped.get(category)!.push(variable)
      }

      return Array.from(grouped.entries()).map(([category, vars]) => [
        // Category label
        {
          label: formatCategoryLabel(category),
          disabled: true
        },
        // Category items
        ...vars.map(v => ({
          label: v.name,
          description: v.description || v.label,
          icon: v.icon || 'i-lucide-braces'
        }))
      ])
    }

    // No categories - flat list
    return props.variables.map(v => ({
      label: v.name,
      description: v.description || v.label,
      icon: v.icon || 'i-lucide-braces'
    }))
  }

  return []
})

/**
 * Format category name to display label
 */
function formatCategoryLabel(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
</script>
