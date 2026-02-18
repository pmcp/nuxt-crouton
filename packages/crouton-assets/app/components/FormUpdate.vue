<script setup lang="ts">
const props = defineProps<{
  item: Record<string, any>
  collection?: string
}>()

const emit = defineEmits<{ saved: [] }>()

const { mutate, pending } = useCollectionMutation(props.collection || 'assets')
const state = ref({ alt: props.item.alt || '' })

const isImage = props.item.contentType?.startsWith('image/')
const generatingAlt = ref(false)

const fileToBase64 = (url: string): Promise<string> =>
  fetch(url).then(r => r.blob()).then(b => new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result as string)
    reader.onerror = rej
    reader.readAsDataURL(b)
  }))

const generateAltText = async () => {
  if (!isImage || !props.item.pathname) return
  generatingAlt.value = true
  try {
    const image = await fileToBase64(`/images/${props.item.pathname}`)
    const { alt } = await $fetch<{ alt: string }>('/api/assets/generate-alt-text', {
      method: 'POST',
      body: { image, mimeType: props.item.contentType }
    })
    state.value.alt = alt
  }
  catch { /* ignore */ }
  finally { generatingAlt.value = false }
}

const handleSave = async () => {
  await mutate('update', props.item.id, { alt: state.value.alt })
  emit('saved')
}
</script>

<template>
  <!-- Asset preview -->
  <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 mb-2">
    <div class="size-14 rounded overflow-hidden shrink-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
      <img
        v-if="isImage && item.pathname"
        :src="`/images/${item.pathname}`"
        :alt="item.alt || item.filename"
        class="size-full object-cover"
      >
      <UIcon
        v-else
        name="i-lucide-file"
        class="w-6 h-6 text-gray-400"
      />
    </div>
    <div class="min-w-0">
      <p class="text-sm font-medium truncate">
        {{ item.filename }}
      </p>
      <p class="text-xs text-gray-500">
        {{ item.contentType }}
      </p>
    </div>
  </div>

  <!-- Alt text field -->
  <UFormField
    label="Alt Text"
    name="alt"
  >
    <div class="flex gap-2">
      <UInput
        v-model="state.alt"
        placeholder="Describe the image for accessibility"
        class="flex-1"
      />
      <UTooltip
        v-if="isImage"
        text="Generate with AI"
        :delay-duration="0"
      >
        <UButton
          :loading="generatingAlt"
          variant="ghost"
          color="primary"
          icon="i-lucide-sparkles"
          @click="generateAltText"
        />
      </UTooltip>
    </div>
  </UFormField>

  <UButton
    :loading="pending"
    block
    class="mt-4"
    @click="handleSave"
  >
    Save
  </UButton>
</template>
