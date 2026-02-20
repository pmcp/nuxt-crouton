import { defineCroutonManifest, defineGeneratorContribution } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-assets',
  name: 'Asset Management',
  description: 'Asset management - media library with NuxtHub blob storage',
  icon: 'i-lucide-folder-open',
  version: '1.0.0',
  category: 'addon',
  aiHint: 'use when app has media uploads or file management',
  dependencies: [],
  provides: {
    components: [
      { name: 'CroutonAssetsPicker', description: 'Asset picker with gallery', props: ['modelValue', 'crop'] },
      { name: 'CroutonAssetsLibrary', description: 'Media library browser', props: ['collection'] },
    ],
  },

  // Detection patterns — image/file field types and asset refTargets trigger this package
  detects: {
    fieldTypes: ['image', 'file'],
    refTargetPatterns: ['asset', 'file', 'image', 'media'],
  },
})

// ---------------------------------------------------------------------------
// Generator contribution — replaces CroutonImageUpload fallback with full picker
// ---------------------------------------------------------------------------

export const generatorContribution = defineGeneratorContribution({
  enhanceForm(ctx) {
    const { detected } = ctx
    const { assetFields } = detected

    if (!assetFields.length) return null

    const fieldOverrides: Record<string, string> = {}

    for (const field of assetFields) {
      const fieldLabel = field.name.charAt(0).toUpperCase() + field.name.slice(1)

      if (field.type === 'image') {
        fieldOverrides[field.name] = `        <UFormField label="${fieldLabel}" name="${field.name}" class="not-last:pb-4">
          <CroutonAssetsPicker
            v-model="state.${field.name}"
            :crop="true"
          />
        </UFormField>`
      } else if (field.type === 'file') {
        fieldOverrides[field.name] = `        <UFormField label="${fieldLabel}" name="${field.name}" class="not-last:pb-4">
          <CroutonAssetsPicker
            v-model="state.${field.name}"
          />
        </UFormField>`
      } else if (field.refTarget) {
        // Asset reference field — use picker with resolved collection
        const resolvedCollection = field.resolvedCollection || field.refTarget
        fieldOverrides[field.name] = `        <UFormField label="${fieldLabel}" name="${field.name}" class="not-last:pb-4">
          <CroutonAssetsPicker
            v-model="state.${field.name}"
            collection="${resolvedCollection}"
          />
        </UFormField>`
      }
    }

    return { fieldOverrides }
  },
})
