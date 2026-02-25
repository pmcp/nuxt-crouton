<template>
  <div class="w-full">
    <!-- Error state -->
    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-triangle"
      :title="t('errors.unableToLoad')"
      :description="getErrorMessage()"
      class="mb-2"
    />

    <!-- Loading state -->
    <USkeleton
      v-else-if="pending && !options.length"
      class="h-10 w-full"
    />

    <!-- Select menu -->
    <USelectMenu
      v-else
      v-model="selectedValue"
      :items="translatedOptions"
      value-key="value"
      label-key="displayLabel"
      :placeholder="placeholder || t('options.selectPlaceholder', { label })"
      :loading="pending"
      :disabled="!!error"
      size="xl"
      searchable
      class="w-full"
    >
      <!-- Explicitly show selected label since value-key returns value, not object -->
      <template #default="{ modelValue }">
        <span v-if="modelValue" class="truncate">
          {{ getOptionLabel(modelValue as string) }}
        </span>
        <span v-else class="text-dimmed truncate">
          {{ placeholder || t('options.selectPlaceholder', { label }) }}
        </span>
      </template>

      <template #item-label="{ item }">
        <span>{{ (item as any)?.displayLabel || (item as OptionItem)?.label || (item as OptionItem)?.value }}</span>
      </template>

      <template
        v-if="creatable"
        #content-top
      >
        <div class="p-1">
          <UButton
            color="neutral"
            icon="i-lucide-plus"
            variant="soft"
            block
            @click="openCreateModal"
          >
            {{ t('options.createNew', { label }) }}
          </UButton>
        </div>
      </template>
    </USelectMenu>

    <!-- Create option modal -->
    <UModal v-model:open="createModalOpen">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold">
              {{ t('options.createNew', { label }) }}
            </h3>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="createModalOpen = false"
            />
          </div>

          <div class="flex flex-col gap-4">
            <UFormField
              :label="t('options.labelField')"
              required
            >
              <UInput
                v-model="newOption.label"
                :placeholder="t('options.displayName')"
                size="xl"
                class="w-full"
                @keyup.enter="createOption"
              />
            </UFormField>
            <UFormField :label="t('options.valueField')">
              <UInput
                v-model="newOption.value"
                :placeholder="slugifiedLabel || t('options.valuePlaceholder')"
                size="xl"
                class="w-full"
                @keyup.enter="createOption"
              />
              <template #hint>
                <span class="text-xs text-neutral-500">{{ t('options.valueHint') }}</span>
              </template>
            </UFormField>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <UButton
              color="neutral"
              variant="outline"
              @click="createModalOpen = false"
            >
              {{ t('common.cancel') }}
            </UButton>
            <UButton
              color="primary"
              :loading="creating"
              :disabled="!newOption.label"
              @click="createOption"
            >
              {{ t('common.create') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { nanoid } from 'nanoid'

interface OptionItemTranslations {
  label?: Record<string, string>
}

interface OptionItem {
  id: string
  value: string
  label: string
  translations?: OptionItemTranslations
}

interface Props {
  modelValue: string | null | undefined
  optionsCollection: string
  optionsField: string
  label: string
  creatable?: boolean
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  creatable: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null | undefined]
}>()

const { t } = useT()
const notify = useNotify()
const { locale } = useI18n()

// Fetch settings data using existing nuxt-crouton composable
const { items, pending, error, refresh } = await useCollectionQuery(props.optionsCollection)

// Get translated label for an option
function getTranslatedLabel(item: OptionItem): string {
  // Check for translation in current locale
  const translation = item.translations?.label?.[locale.value]
  if (translation) {
    return translation
  }
  // Fallback to default label
  return item.label || item.value || ''
}

// Helper to get user-friendly error message
const getErrorMessage = () => {
  if (!error.value) return ''

  const status = error.value.statusCode || error.value.status

  if (status === 404) {
    return t('errors.notFound')
  }

  if (status === 403) {
    return t('errors.noPermission')
  }

  if (status >= 500) {
    return t('errors.serverError')
  }

  return error.value.statusMessage || t('errors.loadingData')
}

// Extract options from the specific field in the settings record
const options = computed<OptionItem[]>(() => {
  const settingsRecord = items.value?.[0]
  if (!settingsRecord) return []

  const fieldData = settingsRecord[props.optionsField]
  if (!Array.isArray(fieldData)) return []

  return fieldData.map((item: any) => ({
    id: item.id || nanoid(),
    value: item.value || item.label?.toLowerCase().replace(/\s+/g, '-') || '',
    label: item.label || item.value || '',
    translations: item.translations || undefined
  }))
})

// Options with translated labels for display
const translatedOptions = computed(() => {
  return options.value.map(item => ({
    ...item,
    displayLabel: getTranslatedLabel(item)
  }))
})

// Computed map for reactive label lookup - maps both value AND id to label
const optionLabelsMap = computed(() => {
  const map = new Map<string, string>()
  for (const opt of translatedOptions.value) {
    const label = opt.displayLabel || opt.label || opt.value
    map.set(opt.value, label)
    // Also map by id in case the stored value is the id
    if (opt.id && opt.id !== opt.value) {
      map.set(opt.id, label)
    }
  }
  return map
})

// Helper to get option label by value (uses computed map for reactivity)
function getOptionLabel(value: string): string {
  return optionLabelsMap.value.get(value) || value
}

// Two-way binding for v-model
const selectedValue = computed({
  get: () => props.modelValue ?? undefined,
  set: (value: string | undefined) => {
    emit('update:modelValue', value ?? null)
  }
})

// Create modal state
const createModalOpen = ref(false)
const creating = ref(false)
const newOption = ref({ label: '', value: '' })

const slugifiedLabel = computed(() => {
  return newOption.value.label
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
})

const openCreateModal = () => {
  newOption.value = { label: '', value: '' }
  createModalOpen.value = true
}

const createOption = async () => {
  if (!newOption.value.label) return

  creating.value = true

  try {
    const { create, update } = useCollectionMutation(props.optionsCollection)
    const settingsRecord = items.value?.[0]

    const optionToAdd: OptionItem = {
      id: nanoid(),
      value: newOption.value.value || slugifiedLabel.value,
      label: newOption.value.label
    }

    // Auto-create settings record if it doesn't exist
    if (!settingsRecord?.id) {
      await create({
        [props.optionsField]: [optionToAdd]
      })
    } else {
      const currentOptions = settingsRecord[props.optionsField] || []
      const updatedOptions = [...currentOptions, optionToAdd]

      await update(settingsRecord.id, {
        [props.optionsField]: updatedOptions
      })
    }

    await refresh()
    emit('update:modelValue', optionToAdd.value)

    createModalOpen.value = false
    newOption.value = { label: '', value: '' }

    notify.success(t('options.createSuccess'), { description: t('options.created', { label: optionToAdd.label }) })
  } catch (err: any) {
    console.error('Failed to create option:', err)
    notify.error(t('errors.failedToCreateOption'), { description: err.message || t('errors.failedToCreateOption') })
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  refresh()
})
</script>
