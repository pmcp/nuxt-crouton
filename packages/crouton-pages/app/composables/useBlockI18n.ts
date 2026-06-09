/**
 * Block i18n resolver
 *
 * Resolves the user-facing strings on block definitions (name, description,
 * field labels/descriptions, select-option labels) through the translation
 * layer, supporting BOTH conventions:
 *
 * 1. Addon blocks (e.g. crouton-sales) store explicit i18n keys directly on the
 *    definition, e.g. label: 'sales.blocks.eventStorefront.fields.eventSlug.label'.
 * 2. Core blocks (block-registry.ts) keep plain English strings on the
 *    definition. Their translations live under a derived key namespace,
 *    `pages.blockLibrary.<shortType>.…`, with the English string acting as the
 *    in-registry fallback.
 *
 * `t(value, fallback)` returns the fallback when a key is missing (this app's
 * t() renders missing keys as `[key]`), so we chain: try the literal value as a
 * key first (resolves explicit addon keys), else a derived core key, else the
 * original text. Plain English core strings therefore render unchanged when no
 * translation exists, and localised when it does.
 */
interface OptionLike { label: string, value: unknown }
interface FieldLike { name: string, label: string, description?: string, options?: OptionLike[] }

export function useBlockI18n() {
  const { t } = useT()

  // 'heroBlock' -> 'hero'; the derived key namespace uses the short id.
  const shortId = (type: string) => type.replace(/Block$/, '')
  const base = (type: string) => `pages.blockLibrary.${shortId(type)}`

  // Try `value` as an i18n key (addon blocks), else the derived core key, else
  // fall back to the original text.
  function resolve(value: string | undefined, derivedKey: string): string | undefined {
    if (!value) return undefined
    return t(value, t(derivedKey, value))
  }

  const blockName = (def: { type: string, name: string }) =>
    resolve(def.name, `${base(def.type)}.name`) as string

  const blockDescription = (def: { type: string, description?: string }) =>
    resolve(def.description, `${base(def.type)}.description`)

  const fieldLabel = (type: string, field: FieldLike) =>
    resolve(field.label, `${base(type)}.fields.${field.name}.label`) as string

  const fieldDescription = (type: string, field: FieldLike) =>
    resolve(field.description, `${base(type)}.fields.${field.name}.description`)

  const fieldOptions = (type: string, field: FieldLike): OptionLike[] =>
    (field.options || []).map(o => ({
      ...o,
      label: resolve(o.label, `${base(type)}.fields.${field.name}.options.${o.value}`) as string
    }))

  return { blockName, blockDescription, fieldLabel, fieldDescription, fieldOptions }
}
