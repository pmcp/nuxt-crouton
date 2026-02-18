<script setup lang="ts">
const props = defineProps<{
  collection?: string
  action?: string
  items?: string[]
  activeItem?: Record<string, any>
  loading?: string
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
      @uploaded="handleUploaded"
    />
  </div>

  <!-- Update: edit metadata of existing asset -->
  <div
    v-else-if="action === 'update' && activeItem"
    class="p-6 space-y-4"
  >
    <CroutonAssetsFormUpdate
      :item="activeItem"
      :collection="collection"
      @saved="handleUploaded"
    />
  </div>
</template>
