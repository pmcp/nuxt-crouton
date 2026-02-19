<script setup lang="ts">
type AspectRatioPreset = 'free' | '1:1' | '16:9' | '4:3' | '3:2'

const props = defineProps<{
  collection?: string
  action?: string
  items?: string[]
  activeItem?: Record<string, any>
  loading?: string
  crop?: boolean | { aspectRatio?: number | AspectRatioPreset }
}>()

const { close } = useCrouton()

const handleUploaded = () => close()
</script>

<template>
  <!-- Create: full uploader flow (file select → crop → alt → upload) -->
  <div
    v-if="action === 'create'"
    class="p-6"
  >
    <CroutonAssetsUploader
      :collection="collection"
      :crop="crop ?? true"
      @uploaded="handleUploaded"
    />
  </div>

  <!-- Update: edit metadata of existing asset -->
  <div
    v-else-if="action === 'update' && activeItem"
  >
    <CroutonAssetsFormUpdate
      :item="activeItem"
      :collection="collection"
      @saved="handleUploaded"
    />
  </div>
</template>
