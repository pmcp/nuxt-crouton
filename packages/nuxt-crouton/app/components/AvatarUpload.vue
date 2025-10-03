<template>
  <div class="flex items-center gap-2">
    <UAvatar
      :src="model || undefined"
      :size="avatarSize"
      icon="i-lucide-upload"
      :ui="{ icon: 'text-lg' }"
      class="ring-1 ring-neutral-200 dark:ring-neutral-800"
    />
    <UButton
      type="button"
      color="neutral"
      variant="soft"
      :label="model ? 'Change' : 'Upload'"
      size="xs"
      @click="() => open()"
    />
    <UButton
      v-if="model"
      type="button"
      color="error"
      variant="soft"
      label="Remove"
      size="xs"
      @click="removeImage"
    />
  </div>
</template>

<script setup lang="ts">
import { useFileDialog, useObjectUrl } from '@vueuse/core'

withDefaults(
  defineProps<{
    avatarSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  }>(),
  {
    avatarSize: '3xl',
  },
)

const model = defineModel<string | undefined>()

const { files, open, onChange } = useFileDialog({
  accept: 'image/*',
  multiple: false,
})

const emit = defineEmits<{
  'file-selected': [file: File | null]
}>()

onChange(() => {
  const file = files.value?.[0]
  if (file) {
    const objectUrl = useObjectUrl(file)
    model.value = objectUrl.value
    emit('file-selected', file)
  }
})

const removeImage = () => {
  model.value = ''
  emit('file-selected', null)
}
</script>
