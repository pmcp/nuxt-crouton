import { useDebounceFn } from '@vueuse/core'
import type { Ref } from 'vue'

// ─── Transform types ──────────────────────────────────────────────────────────

type FieldTransformName = 'slug' | 'lowercase' | 'uppercase' | 'trim'
type FieldTransformFn = (value: string) => string

interface FieldOptions {
  transform?: FieldTransformName | FieldTransformFn
}

// Slugify function for URL-safe slug generation
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Available field transforms
const fieldTransforms: Record<FieldTransformName, FieldTransformFn> = {
  slug: slugify,
  lowercase: (v: string) => v.toLowerCase(),
  uppercase: (v: string) => v.toUpperCase(),
  trim: (v: string) => v.trim(),
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useFieldTransforms(
  fieldOptions: Ref<Record<string, FieldOptions> | undefined>,
  getFieldValue: (field: string, localeCode: string) => string,
  updateFieldValue: (field: string, value: string, localeCode?: string) => void,
  editingLocale: Ref<string>,
) {
  // Get the transform function for a field (if configured)
  function getFieldTransform(field: string): FieldTransformFn | undefined {
    const options = fieldOptions.value?.[field]
    if (!options?.transform) return undefined

    if (typeof options.transform === 'function') {
      return options.transform as FieldTransformFn
    }

    return fieldTransforms[options.transform as FieldTransformName]
  }

  // Debounced transform application (200ms delay for smooth typing)
  const applyTransformDebounced = useDebounceFn((field: string, value: string, localeCode: string) => {
    const transform = getFieldTransform(field)
    if (transform) {
      const transformed = transform(value)
      if (transformed !== value) {
        updateFieldValue(field, transformed, localeCode)
      }
    }
  }, 200)

  // Update field with optional debounced transform (for input events)
  function updateFieldWithTransform(field: string, value: string, localeCode?: string) {
    const targetLocale = localeCode || editingLocale.value

    // Always update immediately with raw value for responsive typing
    updateFieldValue(field, value, targetLocale)

    // Schedule debounced transform if configured
    const transform = getFieldTransform(field)
    if (transform) {
      applyTransformDebounced(field, value, targetLocale)
    }
  }

  // Handle blur - apply transform immediately
  function handleFieldBlur(field: string, localeCode?: string) {
    const targetLocale = localeCode || editingLocale.value
    const transform = getFieldTransform(field)
    if (!transform) return

    const currentValue = getFieldValue(field, targetLocale)
    if (!currentValue) return

    const transformed = transform(currentValue)
    if (transformed !== currentValue) {
      updateFieldValue(field, transformed, targetLocale)
    }
  }

  return {
    getFieldTransform,
    updateFieldWithTransform,
    handleFieldBlur,
  }
}
