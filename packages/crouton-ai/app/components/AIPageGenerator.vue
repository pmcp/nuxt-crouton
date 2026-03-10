<script setup lang="ts">
interface LocaleOption {
  code: string
  name: string
}

interface GeneratedLocale {
  locale: string
  content: string
  seoTitle: string
  seoDescription: string
}

const props = defineProps<{
  availableLocales?: LocaleOption[]
  currentLocale?: string
}>()

const isOpen = defineModel<boolean>({ default: false })

const emit = defineEmits<{
  apply: [results: GeneratedLocale[]]
}>()

const brief = ref('')
const url = ref('')
const isGenerating = ref(false)
const error = ref<string | null>(null)

// Which locales to generate for (defaults to current locale)
const selectedLocales = ref<string[]>([])

// Sync selected locales when modal opens or currentLocale changes
watch([isOpen, () => props.currentLocale], ([open]) => {
  if (open) {
    selectedLocales.value = props.currentLocale ? [props.currentLocale] : ['en']
    error.value = null
  }
})

const hasMultipleLocales = computed(() => (props.availableLocales?.length ?? 0) > 1)

function toggleLocale(code: string) {
  if (selectedLocales.value.includes(code)) {
    // Always keep at least one locale selected
    if (selectedLocales.value.length > 1) {
      selectedLocales.value = selectedLocales.value.filter(l => l !== code)
    }
  }
  else {
    selectedLocales.value = [...selectedLocales.value, code]
  }
}

const examples = [
  'Landing page for a SaaS project management tool targeting small teams',
  'Homepage for a local bakery with online orders and a story section',
  'Service page for a freelance UX designer showcasing work and contact',
  'Product page for a minimalist leather wallet with features and pricing'
]

async function generate() {
  if (!brief.value.trim() || isGenerating.value || selectedLocales.value.length === 0) return

  isGenerating.value = true
  error.value = null

  try {
    // Build locale → language name map
    const localeNames = Object.fromEntries(
      (props.availableLocales ?? []).map(l => [l.code, l.name])
    )

    // Generate for all selected locales in parallel
    const results = await Promise.all(
      selectedLocales.value.map(async (localeCode) => {
        const language = localeNames[localeCode]
        const body: Record<string, string> = { brief: brief.value.trim() }
        if (url.value.trim()) body.url = url.value.trim()
        if (language) body.language = language

        const result = await $fetch<{ content: string, seoTitle: string, seoDescription: string }>(
          '/api/ai/generate-page',
          { method: 'POST', body }
        )
        return {
          locale: localeCode,
          content: result.content,
          seoTitle: result.seoTitle,
          seoDescription: result.seoDescription
        }
      })
    )

    emit('apply', results)
    isOpen.value = false
    brief.value = ''
    url.value = ''
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

const { t } = useT()

const generateLabel = computed(() => {
  if (isGenerating.value) {
    return selectedLocales.value.length > 1
      ? `Generating ${selectedLocales.value.length} languages…`
      : 'Generating…'
  }
  return selectedLocales.value.length > 1
    ? `Generate in ${selectedLocales.value.length} languages`
    : 'Generate page'
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
              Describe what you want and the AI will create a structured page with blocks and SEO fields.
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
          <label class="text-xs font-medium text-muted">{{ t('pages.editor.yourBrief') }}</label>
          <UTextarea
            v-model="brief"
            :rows="4"
            placeholder="Describe your page — what it's for, who it's targeting, what sections you need..."
            :disabled="isGenerating"
            autoresize
            @keydown="handleKeydown"
          />
          <p class="text-xs text-muted">
            <UKbd :size="('xs' as any)">⌘ Enter</UKbd> to generate
          </p>
        </div>

        <!-- URL inspiration (optional) -->
        <div class="flex flex-col gap-2">
          <label class="text-xs font-medium text-muted">
            Reference URL <span class="font-normal opacity-60">(optional)</span>
          </label>
          <UInput
            v-model="url"
            placeholder="https://example.com — AI uses the page structure as inspiration"
            icon="i-lucide-link"
            :disabled="isGenerating"
            type="url"
          />
        </div>

        <!-- Language selector (only shown when multiple locales configured) -->
        <div v-if="hasMultipleLocales" class="flex flex-col gap-2">
          <label class="text-xs font-medium text-muted">Generate for</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="loc in availableLocales"
              :key="loc.code"
              type="button"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
              :class="selectedLocales.includes(loc.code)
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-elevated border-default text-muted hover:text-default'"
              :disabled="isGenerating"
              @click="toggleLocale(loc.code)"
            >
              <UIcon
                :name="selectedLocales.includes(loc.code) ? 'i-lucide-check' : 'i-lucide-globe'"
                class="size-3"
              />
              {{ loc.name }}
            </button>
          </div>
          <p v-if="selectedLocales.length > 1" class="text-xs text-muted">
            The AI will generate separate content for each language in parallel.
          </p>
        </div>

        <!-- Example prompts -->
        <div class="flex flex-col gap-2">
          <p class="text-xs font-medium text-muted">{{ t('pages.editor.examples') }}</p>
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
            :disabled="!brief.trim() || isGenerating || selectedLocales.length === 0"
            @click="generate"
          >
            {{ generateLabel }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
