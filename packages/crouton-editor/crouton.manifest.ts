import { defineCroutonManifest, defineGeneratorContribution } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-editor',
  name: 'Rich Text Editor',
  description: 'Rich text editor - TipTap-based with slash commands',
  icon: 'i-lucide-pen-tool',
  version: '1.0.0',
  category: 'addon',
  aiHint: 'use when app has content/articles/posts/rich text',
  dependencies: [],
  provides: {
    components: [
      { name: 'CroutonEditorSimple', description: 'Simple TipTap editor', props: ['modelValue'] },
    ],
  },

  // Detection patterns — fields using Editor components trigger this package
  detects: {
    componentPatterns: ['EditorSimple', 'EditorFull', 'Editor'],
  },
})

// ---------------------------------------------------------------------------
// Generator contribution — adds CroutonEditorPreview cell template for list
// ---------------------------------------------------------------------------

export const generatorContribution = defineGeneratorContribution({
  enhanceList(ctx) {
    const { detected } = ctx
    const { editorFields } = detected

    if (!editorFields.length) return null

    const cellTemplates: Record<string, string> = {}

    // Check which editor fields are translatable (need t() accessor)
    const translatableFieldNames: string[] = (ctx.collectionConfig as any)?.translatableFieldNames || []

    for (const field of editorFields) {
      const isTranslatable = translatableFieldNames.includes(field.name)
      const contentAccess = isTranslatable
        ? `t(row.original, '${field.name}')`
        : `row.original.${field.name}`

      cellTemplates[field.name] = `
    <template #${field.name}-cell="{ row }">
      <CroutonEditorPreview :content="${contentAccess}" />
    </template>`
    }

    return { cellTemplates }
  },
})
