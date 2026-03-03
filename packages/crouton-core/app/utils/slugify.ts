import { slugify } from '../../shared/utils/slugify'

// Re-export canonical slugify from shared (available to both app and server)
export { slugify }

/**
 * Field transform functions for use with form inputs.
 * Can be referenced by name in fieldOptions.transform.
 */
export const fieldTransforms = {
  slug: slugify,
  lowercase: (v: string) => v.toLowerCase(),
  uppercase: (v: string) => v.toUpperCase(),
  trim: (v: string) => v.trim(),
} as const

export type FieldTransformName = keyof typeof fieldTransforms
export type FieldTransformFn = (value: string) => string
