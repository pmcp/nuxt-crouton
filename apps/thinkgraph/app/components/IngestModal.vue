<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  submit: [text: string]
}>()

const text = ref('')

function onSubmit() {
  if (!text.value.trim()) return
  emit('submit', text.value)
  text.value = ''
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content="{ close }">
      <div class="p-6">
        <div class="flex items-center gap-2 mb-1">
          <UIcon name="i-lucide-clipboard-paste" class="size-4 text-violet-500" />
          <h3 class="text-lg font-semibold">Ingest Text</h3>
        </div>
        <p class="text-sm text-muted mb-4">
          Paste a meeting transcript, notes, or any text. AI will extract actionable items as nodes.
        </p>

        <UTextarea
          v-model="text"
          placeholder="Paste transcript, notes, or ideas here..."
          :rows="10"
          autofocus
          class="w-full"
          @keydown.meta.enter="onSubmit"
        />

        <div class="flex justify-end gap-2 mt-6">
          <UButton variant="ghost" color="neutral" @click="close">Cancel</UButton>
          <UButton
            icon="i-lucide-sparkles"
            label="Extract Items"
            :disabled="!text.trim()"
            @click="onSubmit"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
