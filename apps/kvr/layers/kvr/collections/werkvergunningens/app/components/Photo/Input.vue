<script setup lang="ts">
import { nanoid } from 'nanoid'

interface KvrWerkvergunningensPhotoItem {
  id: string
  assetId?: string // stores the blob pathname
  caption?: string
}

const model = defineModel<KvrWerkvergunningensPhotoItem>({ required: true })

if (model.value && !model.value.id) {
  model.value = { ...model.value, id: nanoid() }
}

const uploading = ref(false)
const uploadError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

async function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploading.value = true
  uploadError.value = null
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await $fetch<{ pathname: string }>('/api/upload-image', {
      method: 'POST',
      body: form,
    })
    if (model.value) {
      model.value = { ...model.value, assetId: res.pathname }
    }
  }
  catch (err) {
    uploadError.value = err instanceof Error ? err.message : 'Upload failed'
  }
  finally {
    uploading.value = false
    if (target) target.value = ''
  }
}

function removeImage() {
  if (model.value) model.value = { ...model.value, assetId: undefined }
}

const previewUrl = computed(() =>
  model.value?.assetId ? `/images/${model.value.assetId}` : null
)
</script>

<template>
  <div class="flex items-start gap-3 w-full">
    <div class="w-28 h-28 shrink-0 relative rounded-md border border-dashed border-neutral-300 bg-neutral-50 overflow-hidden">
      <img
        v-if="previewUrl"
        :src="previewUrl"
        class="w-full h-full object-cover"
        alt="Foto"
      >
      <button
        v-else
        type="button"
        class="w-full h-full flex flex-col items-center justify-center text-xs text-neutral-500 hover:bg-neutral-100"
        :disabled="uploading"
        @click="fileInput?.click()"
      >
        <UIcon
          :name="uploading ? 'i-lucide-loader-2' : 'i-lucide-image-plus'"
          :class="['size-5 mb-1', uploading && 'animate-spin']"
        />
        <span>{{ uploading ? 'Uploaden…' : 'Kies foto' }}</span>
      </button>
      <button
        v-if="previewUrl"
        type="button"
        class="absolute top-1 right-1 size-5 flex items-center justify-center rounded-full bg-white/90 text-neutral-700 hover:bg-white shadow"
        @click="removeImage"
      >
        <UIcon name="i-lucide-x" class="size-3" />
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onFileSelected"
      >
    </div>
    <div class="flex-1 space-y-1">
      <UInput
        v-model="model.caption"
        class="w-full"
        size="md"
        placeholder="Omschrijving (bv. situatie voor werken, kabellabel…)"
      />
      <p v-if="uploadError" class="text-xs text-red-600">{{ uploadError }}</p>
    </div>
  </div>
</template>
