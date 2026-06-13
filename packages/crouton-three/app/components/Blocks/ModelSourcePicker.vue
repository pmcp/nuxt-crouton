<script setup lang="ts">
/**
 * CroutonThreeBlocksModelSourcePicker
 *
 * Custom property component for the `three-model` block field. Uses the
 * crouton-assets media picker when that package is installed (detected via
 * useCroutonApps().hasApp('assets')), and always offers a direct URL field as
 * a fallback. Emits the resolved model URL string via update:modelValue.
 *
 * No hard dependency on @fyit/crouton-assets — CroutonAssetsPicker resolves to
 * a no-op stub from crouton-core when the package is absent, and the v-if keeps
 * it hidden in that case.
 */
import { computed } from 'vue'

interface Props {
  modelValue: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { hasApp } = useCroutonApps()
const hasAssets = computed(() => hasApp('assets'))

// The assets picker emits the full asset record on select — derive the public
// blob URL (/images/[pathname]) and store that as the model source.
function onAssetSelect(asset: Record<string, unknown>) {
  const pathname = asset?.pathname as string | undefined
  if (pathname) emit('update:modelValue', `/images/${pathname}`)
}

// Avoid referencing props.modelValue directly in the template binding so the
// component never feeds its own update back as the asset id.
const url = computed(() => props.modelValue || '')
</script>

<template>
  <div class="space-y-2">
    <CroutonAssetsPicker
      v-if="hasAssets"
      @select="onAssetSelect"
    />
    <UInput
      :model-value="url"
      placeholder="https://example.com/model.glb"
      icon="i-lucide-link"
      class="w-full"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <p class="text-xs text-muted">
      {{ hasAssets
        ? 'Pick a .glb/.gltf from your media library, or paste a URL.'
        : 'Paste a public .glb or .gltf model URL.' }}
    </p>
  </div>
</template>
