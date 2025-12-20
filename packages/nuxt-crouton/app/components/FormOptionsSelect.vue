<template>
  <div class="w-full">
    <!-- Error state -->
    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-triangle"
      title="Unable to load options"
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
      :items="options"
      value-key="value"
      label-key="label"
      :placeholder="placeholder || `Select ${label}`"
      :loading="pending"
      :disabled="!!error"
      size="xl"
      searchable
      class="w-full"
    >
      <template #item-label="{ item }">
        <span>{{ (item as OptionItem)?.label || (item as OptionItem)?.value }}</span>
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
            Create new {{ label }}
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
              Create new {{ label }}
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
              label="Label"
              required
            >
              <UInput
                v-model="newOption.label"
                placeholder="Display name"
                size="xl"
                class="w-full"
                @keyup.enter="createOption"
              />
            </UFormField>
            <UFormField label="Value">
              <UInput
                v-model="newOption.value"
                :placeholder="slugifiedLabel || 'Auto-generated from label'"
                size="xl"
                class="w-full"
                @keyup.enter="createOption"
              />
              <template #hint>
                <span class="text-xs text-neutral-500">Leave empty to auto-generate from label</span>
              </template>
            </UFormField>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <UButton
              color="neutral"
              variant="outline"
              @click="createModalOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              :loading="creating"
              :disabled="!newOption.label"
              @click="createOption"
            >
              Create
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { nanoid } from 'nanoid'

interface OptionItem {
  id: string
  value: string
  label: string
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

const toast = useToast()

// Fetch settings data using existing nuxt-crouton composable
const { items, pending, error, refresh } = await useCollectionQuery(props.optionsCollection)

// Helper to get user-friendly error message
const getErrorMessage = () => {
  if (!error.value) return ''

  const status = error.value.statusCode || error.value.status

  if (status === 404) {
    return `Settings collection "${props.optionsCollection}" not found. Please create it first.`
  }

  if (status === 403) {
    return 'You do not have permission to view settings.'
  }

  if (status >= 500) {
    return 'A server error occurred. Please try again later.'
  }

  return error.value.statusMessage || 'An error occurred while loading options.'
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
    label: item.label || item.value || ''
  }))
})

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

    toast.add({
      title: 'Option created',
      description: `"${optionToAdd.label}" has been added`,
      color: 'success'
    })
  } catch (err: any) {
    console.error('Failed to create option:', err)
    toast.add({
      title: 'Error',
      description: err.message || 'Failed to create option',
      color: 'error'
    })
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  refresh()
})
</script>
