<script setup lang="ts">
import { resolveComponent } from 'vue'

const props = defineProps<{
  collection?: string
}>()

const { getConfig } = useCollections()
// Use the registry key ('assets' is the canonical key, per CroutonAssetsPicker convention)
// useCollectionQuery needs the registry key, NOT the apiPath URL segment
const collectionName = props.collection || (getConfig('assets') ? 'assets' : 'assetsAssets')

const { items, pending, refresh } = await useCollectionQuery(collectionName)

const showUploader = ref(false)

const assetCardComponent = resolveComponent('CroutonAssetsCard')

const handleUploaded = async (close: () => void) => {
  await refresh()
  close()
  showUploader.value = false
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Upload button toolbar -->
    <div class="flex items-center justify-end px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
      <UButton
        icon="i-lucide-upload"
        label="Upload"
        size="sm"
        @click="showUploader = true"
      />
    </div>

    <!-- Collection grid — search, filter, pagination for free -->
    <CroutonCollection
      :collection="collectionName"
      layout="grid"
      grid-size="compact"
      :rows="items || []"
      :card-component="assetCardComponent"
      create
      class="flex-1 min-h-0 overflow-auto"
    />

    <!-- Upload modal -->
    <UModal v-model:open="showUploader">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">
            Upload Asset
          </h3>
          <CroutonAssetsUploader
            :collection="collectionName"
            @uploaded="handleUploaded(close)"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
