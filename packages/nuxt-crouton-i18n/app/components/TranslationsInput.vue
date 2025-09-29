<script setup lang="ts">
const props = defineProps<{
  modelValue: Record<string, string> // The translations object { en: 'Hello', nl: 'Hallo' }
  fields: string[] // Fields to translate (for backwards compat, default to ['value'])
  label?: string
  error?: string | boolean // Validation error state
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string>]
}>()

const { locale, locales } = useI18n()

// Track which locale we're editing
const editingLocale = ref(locale.value)
const showAllLanguages = ref(false)

// For backwards compatibility with fields prop
// const field = computed(() => props.fields?.[0] || 'value')

// Current value for the editing locale
const currentValue = computed(() => {
  return props.modelValue?.[editingLocale.value] || ''
})

function updateValue(value: string, locale?: string) {
  const targetLocale = locale || editingLocale.value
  const updated = {
    ...props.modelValue,
    [targetLocale]: value
  }
  emit('update:modelValue', updated)
}

// function copyToOtherLanguages() {
//   if (!props.modelValue?.en) return
//
//   const updated = { ...props.modelValue }
//   // Copy English value to all other languages
//   locales.value.forEach(loc => {
//     const localeCode = typeof loc === 'string' ? loc : loc.code
//     if (localeCode !== 'en') {
//       updated[localeCode] = props.modelValue.en
//     }
//   })
//   emit('update:modelValue', updated)
// }

// function clearLanguage(locale: string) {
//   if (locale === 'en') return
//
//   const updated = { ...props.modelValue }
//   delete updated[locale]
//   emit('update:modelValue', updated)
// }

// Show completion status
const translationStatus = computed(() => {
  return locales.value.map(loc => {
    const localeCode = typeof loc === 'string' ? loc : loc.code
    return {
      locale: localeCode,
      complete: !!props.modelValue?.[localeCode]
    }
  })
})
</script>

<template>
  <div class="space-y-4">
    <!-- Help text -->
    <div class="text-xs text-gray-500 dark:text-gray-400">
      <span class="text-red-500">*</span> English translation is required. Other languages are optional and will fallback to English if not provided.
    </div>

    <!-- Language selector with status indicators -->
    <div class="flex items-center justify-between">
      <UFieldGroup class="w-full">
        <UButton
          v-for="loc in locales"
          :key="typeof loc === 'string' ? loc : loc.code"
          :variant="editingLocale === (typeof loc === 'string' ? loc : loc.code) ? 'solid' : 'outline'"
          @click="editingLocale = typeof loc === 'string' ? loc : loc.code"
          size="sm"
          class="w-full"
        >
          <span class="flex items-center gap-2">
            {{ (typeof loc === 'string' ? loc : loc.code).toUpperCase() }}
            <span v-if="(typeof loc === 'string' ? loc : loc.code) === 'en'" class="text-red-500">*</span>
            <UIcon
              v-if="translationStatus.find(s => s.locale === (typeof loc === 'string' ? loc : loc.code))?.complete"
              name="i-lucide-check-circle"
              class="text-green-500"
            />
          </span>
        </UButton>
      </UFieldGroup>

    </div>

    <!-- Single language edit mode -->
    <div v-if="!showAllLanguages" class="space-y-3">
      <UFormField
        :label="`Translation (${editingLocale.toUpperCase()})${editingLocale === 'en' ? ' *' : ''}`"
        :name="`values.${editingLocale}`"
        :required="editingLocale === 'en'"
      >
        <UInput
          :model-value="currentValue"
          @update:model-value="updateValue($event)"
          :placeholder="editingLocale !== 'en' && modelValue?.en ? `Fallback: ${modelValue.en}` : ''"
          :color="error && editingLocale === 'en' && !currentValue ? 'error' : 'primary'"
          :highlight="!!(error && editingLocale === 'en' && !currentValue)"
          class="w-full"
          size="lg"
        />
      </UFormField>

      <!-- Show original for reference when not editing English -->
      <p
        v-if="editingLocale !== 'en' && modelValue?.en"
        class="text-xs text-gray-500 mt-1"
      >
        English: {{ modelValue.en }}
      </p>
    </div>

    <!-- All languages grid mode -->
    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UFormField
          v-for="loc in locales"
          :key="typeof loc === 'string' ? loc : loc.code"
          :label="(typeof loc === 'string' ? loc : loc.code).toUpperCase()"
          :required="(typeof loc === 'string' ? loc : loc.code) === 'en'"
        >
          <UInput
            v-model="modelValue[(typeof loc === 'string' ? loc : loc.code)]"
            @update:model-value="updateValue($event, typeof loc === 'string' ? loc : loc.code)"
            :color="error && (typeof loc === 'string' ? loc : loc.code) === 'en' && !modelValue?.[(typeof loc === 'string' ? loc : loc.code)] ? 'error' : 'primary'"
            :highlight="!!(error && (typeof loc === 'string' ? loc : loc.code) === 'en' && !modelValue?.[(typeof loc === 'string' ? loc : loc.code)])"
            size="md"
          />
        </UFormField>
      </div>
    </div>

    <!-- Quick actions -->
<!--    <div class="flex gap-2 pt-2 border-t">-->
<!--      <UButton-->
<!--        size="xs"-->
<!--        variant="ghost"-->
<!--        @click="copyToOtherLanguages"-->
<!--      >-->
<!--        Copy EN to all-->
<!--      </UButton>-->
<!--      <UButton-->
<!--        size="xs"-->
<!--        variant="ghost"-->
<!--        @click="clearLanguage(editingLocale)"-->
<!--        :disabled="editingLocale === 'en'"-->
<!--      >-->
<!--        Clear {{ editingLocale.toUpperCase() }}-->
<!--      </UButton>-->
<!--    </div>-->
  </div>
</template>
