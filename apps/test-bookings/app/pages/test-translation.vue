<script setup lang="ts">
/**
 * Test page for AI Translation feature
 *
 * Tests:
 * 1. CroutonI18nInput with showAITranslate prop
 * 2. CroutonEditorSimple with enableTranslationAI prop
 */

// Form state for i18n input test
const translations = ref({
  en: {
    name: 'Tennis Court Booking',
    description: 'Book your tennis court online. Easy reservations for singles and doubles matches.'
  },
  nl: {
    name: '',
    description: ''
  },
  fr: {
    name: '',
    description: ''
  }
})

// Editor content for rich text test
const editorContent = ref(`<p>Welcome to our booking system!</p>
<p>You can easily book tennis courts, badminton courts, and squash courts.</p>
<p>Our facilities include:</p>
<ul>
  <li>8 outdoor tennis courts</li>
  <li>4 indoor courts</li>
  <li>Professional lighting for evening play</li>
</ul>`)

// Translation context for the editor
const translationContext = computed(() => ({
  sourceText: editorContent.value,
  sourceLanguage: 'en',
  targetLanguage: selectedTargetLanguage.value,
  fieldType: 'description'
}))

const selectedTargetLanguage = ref('nl')

const targetLanguages = [
  { label: 'Dutch (NL)', value: 'nl' },
  { label: 'French (FR)', value: 'fr' },
  { label: 'German (DE)', value: 'de' },
  { label: 'Spanish (ES)', value: 'es' }
]

// Test the composable directly
const { suggestion, isLoading, suggest, accept, clear } = useTranslationSuggestion()

async function testComposable() {
  await suggest({
    sourceText: 'Hello, welcome to our tennis club!',
    sourceLanguage: 'en',
    targetLanguage: selectedTargetLanguage.value,
    fieldType: 'greeting'
  })
}

function acceptSuggestion() {
  const text = accept()
  if (text) {
    useToast().add({ title: 'Translation accepted', description: text })
  }
}
</script>

<template>
  <div class="container mx-auto py-8 px-4 max-w-4xl">
    <h1 class="text-2xl font-bold mb-8">
      AI Translation Test Page
    </h1>

    <!-- Section 1: CroutonI18nInput Test -->
    <UCard class="mb-8">
      <template #header>
        <h2 class="text-lg font-semibold">
          1. CroutonI18nInput with AI Translation
        </h2>
        <p class="text-sm text-gray-500">
          Switch to NL or FR tab and click "Translate" button next to the English reference
        </p>
      </template>

      <CroutonI18nInput
        v-model="translations"
        :fields="['name', 'description']"
        show-ai-translate
        field-type="product"
      />

      <template #footer>
        <div class="text-xs text-gray-400">
          <pre class="overflow-auto">{{ JSON.stringify(translations, null, 2) }}</pre>
        </div>
      </template>
    </UCard>

    <!-- Section 2: Editor with Translation -->
    <UCard class="mb-8">
      <template #header>
        <h2 class="text-lg font-semibold">
          2. CroutonEditorSimple with AI Translation
        </h2>
        <p class="text-sm text-gray-500">
          Select text and click the sparkles button (or press Cmd+J) to translate
        </p>
      </template>

      <div class="mb-4">
        <label class="text-sm font-medium mb-2 block">Target Language:</label>
        <USelect
          v-model="selectedTargetLanguage"
          :items="targetLanguages"
          value-key="value"
          class="w-48"
        />
      </div>

      <div class="border rounded-lg overflow-hidden h-64">
        <CroutonEditorSimple
          v-model="editorContent"
          enable-translation-ai
          :translation-context="translationContext"
          placeholder="Type some text to translate..."
        />
      </div>
    </UCard>

    <!-- Section 3: Direct Composable Test -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          3. useTranslationSuggestion Composable
        </h2>
        <p class="text-sm text-gray-500">
          Test the composable directly
        </p>
      </template>

      <div class="space-y-4">
        <div class="flex gap-2">
          <UButton
            :loading="isLoading"
            @click="testComposable"
          >
            Translate "Hello, welcome to our tennis club!"
          </UButton>
          <UButton
            v-if="suggestion"
            color="primary"
            variant="soft"
            @click="acceptSuggestion"
          >
            Accept
          </UButton>
          <UButton
            v-if="suggestion"
            color="neutral"
            variant="ghost"
            @click="clear"
          >
            Clear
          </UButton>
        </div>

        <div
          v-if="suggestion"
          class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <p class="text-sm text-gray-500 mb-1">Translation ({{ selectedTargetLanguage }}):</p>
          <p class="text-lg">{{ suggestion.text }}</p>
          <p
            v-if="suggestion.confidence"
            class="text-xs text-gray-400 mt-2"
          >
            Confidence: {{ (suggestion.confidence * 100).toFixed(0) }}%
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
