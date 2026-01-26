/**
 * URL-safe slug transformation
 * Converts text to lowercase, replaces spaces/underscores with hyphens,
 * removes special characters, and trims leading/trailing hyphens.
 *
 * @example slugify("Start Here!") // "start-here"
 * @example slugify("  Hello  World  ") // "hello-world"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

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
