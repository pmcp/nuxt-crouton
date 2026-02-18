<script setup lang="ts">
const props = defineProps<{
  teamId: string
  collection?: string
}>()

const showUploader = ref(false)
const searchQuery = ref('')
const typeFilter = ref('all')
const selectedAssetId = ref<string | null>(null)

const { getConfig } = useCollections()
const collectionName = props.collection || getConfig('assets')?.apiPath || 'assets-assets'

const { data: assetsData, pending, refresh } = await useFetch(
  () => `/api/teams/${props.teamId}/${collectionName}`
)

const tabs = [
  { label: 'All', value: 'all' },
  { label: 'Images', value: 'image' },
  { label: 'Video', value: 'video' },
  { label: 'Audio', value: 'audio' },
  { label: 'Documents', value: 'document' },
]

const isImage = (contentType?: string) => contentType?.startsWith('image/')
const isVideo = (contentType?: string) => contentType?.startsWith('video/')
const isAudio = (contentType?: string) => contentType?.startsWith('audio/')
const isDocument = (contentType?: string) =>
  contentType === 'application/pdf'
  || contentType?.includes('word')
  || contentType?.includes('spreadsheet')
  || contentType?.includes('presentation')

const getFileCategory = (contentType?: string): string => {
  if (isImage(contentType)) return 'image'
  if (isVideo(contentType)) return 'video'
  if (isAudio(contentType)) return 'audio'
  if (isDocument(contentType)) return 'document'
  return 'other'
}

const filteredAssets = computed(() => {
  if (!assetsData.value) return []
  let result = assetsData.value as any[]

  if (typeFilter.value !== 'all') {
    result = result.filter((asset: any) =>
      getFileCategory(asset.contentType) === typeFilter.value
    )
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((asset: any) =>
      asset.filename?.toLowerCase().includes(query)
      || asset.alt?.toLowerCase().includes(query)
    )
  }

  return result
})

const handleUploaded = async (close: () => void) => {
  await refresh()
  close()
  showUploader.value = false
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        placeholder="Search assets..."
        class="flex-1"
      />
      <UButton
        icon="i-lucide-upload"
        label="Upload"
        @click="showUploader = true"
      />
    </div>

    <!-- Type filter tabs -->
    <div class="px-4 pt-3 border-b border-gray-200 dark:border-gray-800">
      <div class="flex gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          class="px-3 py-1.5 text-sm rounded-md transition-colors"
          :class="typeFilter === tab.value
            ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
          @click="typeFilter = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Asset grid -->
    <div class="flex-1 overflow-auto p-4">
      <div
        v-if="pending"
        class="grid grid-cols-4 gap-4"
      >
        <USkeleton
          v-for="i in 8"
          :key="i"
          class="h-32 w-full"
        />
      </div>

      <div
        v-else-if="filteredAssets.length"
        class="grid grid-cols-4 gap-4"
      >
        <CroutonAssetsAssetTile
          v-for="asset in filteredAssets"
          :key="asset.id"
          :asset="asset"
          :selected="selectedAssetId === asset.id"
          :selectable="false"
          @click="selectedAssetId = asset.id"
        />
      </div>

      <div
        v-else
        class="text-center py-16 text-gray-500"
      >
        <UIcon
          name="i-lucide-image-off"
          class="w-12 h-12 mx-auto mb-3"
        />
        <p class="text-sm">
          {{ searchQuery || typeFilter !== 'all' ? 'No assets match your filter' : 'No assets yet' }}
        </p>
        <UButton
          v-if="!searchQuery && typeFilter === 'all'"
          class="mt-4"
          variant="soft"
          icon="i-lucide-upload"
          label="Upload your first asset"
          @click="showUploader = true"
        />
      </div>
    </div>

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
