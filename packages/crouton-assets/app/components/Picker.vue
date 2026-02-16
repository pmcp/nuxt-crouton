<template>
  <div class="space-y-4">
    <!-- Search, Filter and Upload -->
    <div class="flex items-center gap-2">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        placeholder="Search assets..."
        class="flex-1"
      />
      <USelect
        v-model="typeFilter"
        :items="typeFilterOptions"
        class="w-32"
        size="md"
      />
      <UButton
        icon="i-lucide-upload"
        label="Upload New"
        @click="showUploader = true"
      />
    </div>

    <!-- Asset Grid -->
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
      v-else-if="filteredAssets?.length"
      class="grid grid-cols-4 gap-4"
    >
      <button
        v-for="asset in filteredAssets"
        :key="asset.id"
        type="button"
        class="relative group rounded-lg overflow-hidden border-2 transition-all"
        :class="modelValue === asset.id ? 'border-primary-500 ring-2 ring-primary-500' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'"
        @click="selectAsset(asset.id)"
      >
        <div class="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <!-- Image preview -->
          <img
            v-if="isImage(asset.contentType) && asset.pathname"
            :src="`/images/${asset.pathname}`"
            :alt="asset.alt || asset.filename"
            class="w-full h-full object-cover"
          >
          <!-- File type icon for non-images -->
          <div v-else class="flex flex-col items-center gap-1">
            <UIcon
              :name="getFileIcon(asset.contentType)"
              class="w-8 h-8 text-gray-400"
            />
            <span class="text-xs text-gray-400 uppercase">
              {{ getFileExtension(asset.filename) }}
            </span>
          </div>
        </div>
        <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
          {{ asset.filename }}
        </div>
        <div
          v-if="modelValue === asset.id"
          class="absolute top-2 right-2"
        >
          <div class="bg-primary-500 rounded-full p-1">
            <UIcon
              name="i-lucide-check"
              class="w-4 h-4 text-white"
            />
          </div>
        </div>
      </button>
    </div>

    <div
      v-else
      class="text-center py-12 text-gray-500"
    >
      <UIcon
        name="i-lucide-image-off"
        class="w-12 h-12 mx-auto mb-2"
      />
      <p>No assets found</p>
    </div>

    <!-- Upload Modal -->
    <UModal v-model="showUploader">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">
            Upload New Asset
          </h3>
          <CroutonAssetsUploader @uploaded="handleUploaded(close)" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  collection?: string
  crop?: boolean | { aspectRatio?: number }
}>()

const modelValue = defineModel<string>()
const showUploader = ref(false)
const searchQuery = ref('')
const typeFilter = ref('all')

const typeFilterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Images', value: 'image' },
  { label: 'Documents', value: 'document' },
  { label: 'Video', value: 'video' },
  { label: 'Audio', value: 'audio' }
]

// Fetch assets from the generated collection API
const collectionName = props.collection || 'assets'
const { data: assets, pending, refresh } = await useFetch(`/api/teams/${useRoute().params.team}/${collectionName}`)

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

const getFileIcon = (contentType?: string): string => {
  if (isImage(contentType)) return 'i-lucide-image'
  if (isVideo(contentType)) return 'i-lucide-video'
  if (isAudio(contentType)) return 'i-lucide-music'
  if (contentType === 'application/pdf') return 'i-lucide-file-text'
  return 'i-lucide-file'
}

const getFileExtension = (filename?: string): string => {
  if (!filename) return ''
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()! : ''
}

// Filter assets based on search and type
const filteredAssets = computed(() => {
  if (!assets.value) return []

  let result = assets.value as any[]

  // Type filter
  if (typeFilter.value !== 'all') {
    result = result.filter((asset: any) =>
      getFileCategory(asset.contentType) === typeFilter.value
    )
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((asset: any) =>
      asset.filename?.toLowerCase().includes(query)
      || asset.alt?.toLowerCase().includes(query)
    )
  }

  return result
})

const selectAsset = (id: string) => {
  modelValue.value = id
}

const handleUploaded = async (close: () => void) => {
  await refresh()
  close()
  showUploader.value = false
}
</script>
