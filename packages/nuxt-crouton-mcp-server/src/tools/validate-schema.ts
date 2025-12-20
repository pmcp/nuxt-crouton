/**
 * Validate Schema Tool
 * Validates collection schemas before generation
 */

import { z } from 'zod'
import { isValidFieldType, VALID_FIELD_TYPES } from '../utils/field-types.js'

export interface SchemaField {
  type: string
  meta?: {
    primaryKey?: boolean
    required?: boolean
    maxLength?: number
    precision?: number
    scale?: number
    default?: unknown
    unique?: boolean
    component?: string
  }
  refTarget?: string
}

export interface ValidateSchemaInput {
  schema: Record<string, SchemaField>
  options?: {
    hierarchy?: boolean
    translations?: boolean
  }
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  schema: Record<string, SchemaField>
}

/**
 * Validate a collection schema
 */
export function handleValidateSchema(input: ValidateSchemaInput): ValidationResult {
  const { schema, options = {} } = input
  const errors: string[] = []
  const warnings: string[] = []

  // Check if schema is empty
  if (!schema || Object.keys(schema).length === 0) {
    errors.push('Schema is empty. At least one field is required.')
    return { valid: false, errors, warnings, schema }
  }

  // Check for id field with primaryKey (optional - auto-generated)
  const idField = schema['id']
  if (idField && !idField.meta?.primaryKey) {
    warnings.push('The "id" field should have meta.primaryKey: true')
  }

  // Validate each field
  for (const [fieldName, field] of Object.entries(schema)) {
    // Skip auto-generated fields that shouldn't be in schema
    if (['teamId', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'].includes(fieldName)) {
      warnings.push(`Field "${fieldName}" is auto-generated and will be ignored`)
      continue
    }

    // Skip hierarchy fields if hierarchy option is enabled
    if (options.hierarchy && ['parentId', 'path', 'depth', 'order'].includes(fieldName)) {
      warnings.push(`Field "${fieldName}" is auto-generated with --hierarchy and will be ignored`)
      continue
    }

    // Check field has type
    if (!field.type) {
      errors.push(`Field "${fieldName}" is missing the "type" property`)
      continue
    }

    // Validate field type
    if (!isValidFieldType(field.type)) {
      errors.push(
        `Field "${fieldName}" has invalid type "${field.type}". `
        + `Valid types: ${VALID_FIELD_TYPES.join(', ')}`
      )
    }

    // Validate decimal fields
    if (field.type === 'decimal') {
      if (!field.meta?.precision) {
        warnings.push(
          `Field "${fieldName}" (decimal) should specify meta.precision (default: 10)`
        )
      }
      if (!field.meta?.scale) {
        warnings.push(`Field "${fieldName}" (decimal) should specify meta.scale (default: 2)`)
      }
    }

    // Validate string fields
    if (field.type === 'string' && !field.meta?.maxLength) {
      warnings.push(
        `Field "${fieldName}" (string) should specify meta.maxLength for database optimization`
      )
    }

    // Validate refTarget
    if (field.refTarget) {
      if (typeof field.refTarget !== 'string') {
        errors.push(`Field "${fieldName}" has invalid refTarget - must be a string`)
      }
      if (field.type !== 'string') {
        warnings.push(
          `Field "${fieldName}" has refTarget but type is "${field.type}". `
          + `Reference fields should typically be type "string"`
        )
      }
    }

    // Validate meta object
    if (field.meta && typeof field.meta !== 'object') {
      errors.push(`Field "${fieldName}" has invalid meta - must be an object`)
    }
  }

  // Check for at least one meaningful field (not just id)
  const meaningfulFields = Object.keys(schema).filter(
    f => !['id', 'teamId', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'].includes(f)
  )
  if (meaningfulFields.length === 0) {
    warnings.push('Schema only contains auto-generated fields. Add at least one custom field.')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schema
  }
}

export const validateSchemaInputSchema = {
  schema: z.record(z.any()).describe('The schema object to validate'),
  options: z
    .object({
      hierarchy: z.boolean().optional().describe('Whether hierarchy support will be enabled'),
      translations: z.boolean().optional().describe('Whether translations will be generated')
    })
    .optional()
    .describe('Generation options that affect validation')
}

export const validateSchemaToolDefinition = {
  name: 'validate_schema',
  description: `Validate a collection schema before generation.
Checks field types, required properties, and common issues.
Use this AFTER design_schema and BEFORE generate_collection.`
}
