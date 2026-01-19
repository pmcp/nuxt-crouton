import type { EditorVariable, EditorVariableGroup, EditorMentionItem } from '../types/editor'

/**
 * Composable for working with editor variables
 *
 * Provides utilities for:
 * - Converting variables to mention menu format
 * - Interpolating variables in content
 * - Extracting variable names from content
 * - Getting sample values for preview
 */
export function useEditorVariables() {
  /**
   * Convert EditorVariable[] to UEditorMentionMenu items format
   */
  function toMentionItems(variables: EditorVariable[]): EditorMentionItem[] {
    return variables.map(v => ({
      label: v.name,
      description: v.description || v.label,
      icon: v.icon || 'i-lucide-variable'
    }))
  }

  /**
   * Convert grouped variables to mention items with group labels
   */
  function groupedToMentionItems(groups: EditorVariableGroup[]): EditorMentionItem[][] {
    return groups.map(group => [
      { label: group.label, disabled: true } as EditorMentionItem,
      ...toMentionItems(group.variables)
    ])
  }

  /**
   * Group flat variables by category
   */
  function groupByCategory(variables: EditorVariable[]): EditorVariableGroup[] {
    const grouped = new Map<string, EditorVariable[]>()

    for (const variable of variables) {
      const category = variable.category || 'Other'
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(variable)
    }

    return Array.from(grouped.entries()).map(([label, vars]) => ({
      label: formatCategoryLabel(label),
      variables: vars
    }))
  }

  /**
   * Format category name to display label
   */
  function formatCategoryLabel(category: string): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Interpolate variables in content
   *
   * Replaces {{variable_name}} with actual values
   *
   * @param content - Content with variable placeholders
   * @param values - Map of variable names to values
   * @returns Content with variables replaced
   */
  function interpolate(content: string, values: Record<string, string>): string {
    if (!content) return ''

    return content.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, varName) => {
      return values[varName] ?? match
    })
  }

  /**
   * Extract variable names from content
   *
   * @param content - Content to search
   * @returns Array of unique variable names found
   */
  function extractVariables(content: string): string[] {
    if (!content) return []

    const regex = /\{\{\s*(\w+)\s*\}\}/g
    const variables = new Set<string>()
    let match

    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1])
    }

    return Array.from(variables)
  }

  /**
   * Get sample values from variable definitions
   *
   * @param variables - Variable definitions with optional sample values
   * @returns Map of variable names to sample values
   */
  function getSampleValues(variables: EditorVariable[]): Record<string, string> {
    const samples: Record<string, string> = {}

    for (const variable of variables) {
      samples[variable.name] = variable.sample || `[${variable.label}]`
    }

    return samples
  }

  /**
   * Validate that all variables in content are defined
   *
   * @param content - Content to check
   * @param variables - Available variable definitions
   * @returns Array of undefined variable names
   */
  function findUndefinedVariables(content: string, variables: EditorVariable[]): string[] {
    const used = extractVariables(content)
    const defined = new Set(variables.map(v => v.name))

    return used.filter(name => !defined.has(name))
  }

  /**
   * Find variables that are defined but not used in content
   *
   * @param content - Content to check
   * @param variables - Available variable definitions
   * @returns Array of unused variable definitions
   */
  function findUnusedVariables(content: string, variables: EditorVariable[]): EditorVariable[] {
    const used = new Set(extractVariables(content))

    return variables.filter(v => !used.has(v.name))
  }

  /**
   * Highlight variables in HTML content for preview
   *
   * Wraps {{variable}} in a styled span
   */
  function highlightVariables(content: string, className = 'editor-variable'): string {
    if (!content) return ''

    return content.replace(
      /\{\{\s*(\w+)\s*\}\}/g,
      `<span class="${className}">{{$1}}</span>`
    )
  }

  return {
    toMentionItems,
    groupedToMentionItems,
    groupByCategory,
    interpolate,
    extractVariables,
    getSampleValues,
    findUndefinedVariables,
    findUnusedVariables,
    highlightVariables
  }
}
