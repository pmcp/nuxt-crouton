<script setup lang="ts">
/**
 * CroutonAssetsPicker Stub
 *
 * Fallback when @fyit/crouton-assets is not installed.
 * Renders nothing — the v-if/v-else in consumers switches to CroutonImageUpload.
 * The real component (Picker.vue) is provided by crouton-assets with higher priority.
 *
 * Detection: use hasApp('assets') from useCroutonApps() — not resolveComponent().
 */
defineProps<{
  modelValue?: string
  collection?: string
  crop?: boolean | { aspectRatio?: number }
}>()

defineEmits<{
  'update:modelValue': [value: string]
  select: [asset: Record<string, any>]
}>()
</script>

<template>
  <!-- Stub: renders nothing - real component provided by @fyit/crouton-assets -->
</template>
