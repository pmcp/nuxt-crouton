<script setup lang="ts">
const isOpen = defineModel<boolean>({ default: false })

const emit = defineEmits<{
  apply: [content: string]
}>()

const brief = ref('')
const isGenerating = ref(false)
const error = ref<string | null>(null)

const examples = [
  'Landing page for a SaaS project management tool targeting small teams',
  'Homepage for a local bakery with online orders and a story section',
  'Service page for a freelance UX designer showcasing work and contact',
  'Product page for a minimalist leather wallet with features and pricing'
]

async function generate() {
  if (!brief.value.trim() || isGenerating.value) return

  isGenerating.value = true
  error.value = null

  try {
    const result = await $fetch<{ content: string }>('/api/ai/generate-page', {
      method: 'POST',
      body: { brief: brief.value.trim() }
    })
    emit('apply', result.content)
    isOpen.value = false
    brief.value = ''
  }
  catch (err: any) {
    error.value = err?.data?.statusText || err?.message || 'Generation failed. Try a more specific description.'
  }
  finally {
    isGenerating.value = false
  }
}

function useExample(example: string) {
  brief.value = example
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    generate()
  }
}

watch(isOpen, (open) => {
  if (!open) {
    error.value = null
  }
})
</script>

<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'max-w-lg' }">
    <template #content="{ close }">
      <div class="p-6 flex flex-col gap-5">
        <!-- Header -->
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <UIcon name="i-lucide-sparkles" class="size-4 text-primary" />
              <h3 class="font-semibold text-sm">Generate page with AI</h3>
            </div>
            <p class="text-xs text-muted leading-relaxed">
              Describe what you want and the AI will create a structured page with blocks.
            </p>
          </div>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-x"
            size="xs"
            class="-mt-1 -mr-2"
            @click="close"
          />
        </div>

        <!-- Brief input -->
        <div class="flex flex-col gap-2">
          <label class="text-xs font-medium text-muted">Your brief</label>
          <UTextarea
            v-model="brief"
            :rows="4"
            placeholder="Describe your page — what it's for, who it's targeting, what sections you need..."
            :disabled="isGenerating"
            autoresize
            @keydown="handleKeydown"
          />
          <p class="text-xs text-muted">
            <UKbd size="xs">⌘ Enter</UKbd> to generate
          </p>
        </div>

        <!-- Example prompts -->
        <div class="flex flex-col gap-2">
          <p class="text-xs font-medium text-muted">Examples</p>
          <div class="flex flex-col gap-1.5">
            <button
              v-for="example in examples"
              :key="example"
              type="button"
              class="text-left text-xs px-3 py-2 rounded-md bg-elevated hover:bg-accented transition-colors text-muted hover:text-default"
              :disabled="isGenerating"
              @click="useExample(example)"
            >
              {{ example }}
            </button>
          </div>
        </div>

        <!-- Error -->
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          :description="error"
        />

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-1">
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            :disabled="isGenerating"
            @click="close"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            size="sm"
            icon="i-lucide-sparkles"
            :loading="isGenerating"
            :disabled="!brief.trim() || isGenerating"
            @click="generate"
          >
            {{ isGenerating ? 'Generating…' : 'Generate page' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
