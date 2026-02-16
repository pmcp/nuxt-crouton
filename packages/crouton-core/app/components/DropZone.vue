<script setup lang="ts">
import { useDropZone } from '@vueuse/core'

interface Props {
  accept?: string[]
  multiple?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  multiple: false
})

const emit = defineEmits<{
  drop: [files: File[]]
}>()

const dropZoneRef = ref<HTMLElement | null>(null)

const onDrop = (files: File[] | null) => {
  if (!files?.length) return

  let accepted = files
  if (props.accept?.length) {
    accepted = files.filter(f =>
      props.accept!.some(type => {
        if (type.endsWith('/*')) {
          return f.type.startsWith(type.replace('/*', '/'))
        }
        return f.type === type
      })
    )
  }

  if (!props.multiple) {
    accepted = accepted.slice(0, 1)
  }

  if (accepted.length) {
    emit('drop', accepted)
  }
}

const { isOverDropZone } = useDropZone(dropZoneRef, { onDrop })
</script>

<template>
  <div
    ref="dropZoneRef"
    class="relative rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer"
    :class="isOverDropZone
      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
      : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600'
    "
  >
    <slot :is-over="isOverDropZone">
      <div class="flex flex-col items-center justify-center py-8 px-4 text-center">
        <UIcon
          :name="isOverDropZone ? 'i-lucide-download' : 'i-lucide-upload'"
          class="size-8 mb-2"
          :class="isOverDropZone ? 'text-primary-500' : 'text-neutral-400'"
        />
        <p class="text-sm" :class="isOverDropZone ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500'">
          {{ isOverDropZone ? 'Drop files here' : 'Drag & drop files here' }}
        </p>
      </div>
    </slot>
  </div>
</template>
