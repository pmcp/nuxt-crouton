import type { EditorVariable } from '../types/editor'

/**
 * Composable for working with editor variables
 *
 * Provides utilities for:
 * - Interpolating variables in content
 * - Extracting variable names from content
 * - Getting sample values for preview
 * - Validating variable usage in content
 */
export function useEditorVariables() {
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

  return {
    interpolate,
    extractVariables,
    getSampleValues,
    findUndefinedVariables
  }
}
