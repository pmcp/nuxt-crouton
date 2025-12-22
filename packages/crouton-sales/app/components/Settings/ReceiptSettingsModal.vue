<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-receipt" class="w-5 h-5" />
        <span>Receipt Text Settings</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-6">
        <p class="text-sm text-muted">
          Customize the text that appears on printed receipts.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Items Section Title">
            <UInput
              v-model="settings.items_section_title"
              placeholder="ITEMS:"
            />
          </UFormField>

          <UFormField label="Special Instructions Title">
            <UInput
              v-model="settings.special_instructions_title"
              placeholder="SPECIAL INSTRUCTIONS:"
            />
          </UFormField>

          <UFormField label="Complete Order Header">
            <UInput
              v-model="settings.complete_order_header"
              placeholder="*** COMPLETE ORDER ***"
            />
          </UFormField>

          <UFormField label="Staff Order Header">
            <UInput
              v-model="settings.staff_order_header"
              placeholder="*** STAFF ORDER ***"
            />
          </UFormField>

          <UFormField label="Test Print Title">
            <UInput
              v-model="settings.test_title"
              placeholder="PRINTER TEST"
            />
          </UFormField>

          <UFormField label="Test Success Message">
            <UInput
              v-model="settings.test_success_message"
              placeholder="Test completed successfully!"
            />
          </UFormField>
        </div>

        <UFormField label="Footer Text">
          <UTextarea
            v-model="settings.footer_text"
            :rows="2"
            placeholder="Thank you for your order!"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton variant="outline" @click="close">
          Cancel
        </UButton>
        <UButton
          color="primary"
          :loading="saving"
          @click="save"
        >
          Save Settings
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
export interface ReceiptSettings {
  items_section_title: string
  special_instructions_title: string
  complete_order_header: string
  staff_order_header: string
  footer_text: string
  test_title: string
  test_success_message: string
}

const props = defineProps<{
  modelValue: boolean
  /** API endpoint path for loading/saving settings */
  apiEndpoint: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const toast = useToast()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const saving = ref(false)

const settings = ref<ReceiptSettings>({
  items_section_title: 'ITEMS:',
  special_instructions_title: 'SPECIAL INSTRUCTIONS:',
  complete_order_header: '*** COMPLETE ORDER ***',
  staff_order_header: '*** STAFF ORDER ***',
  footer_text: 'Thank you for your order!',
  test_title: 'PRINTER TEST',
  test_success_message: 'Test completed successfully!',
})

async function loadSettings() {
  try {
    const data = await $fetch<ReceiptSettings>(props.apiEndpoint)
    settings.value = data
  }
  catch (error) {
    console.error('Error loading receipt settings:', error)
  }
}

async function save() {
  saving.value = true
  try {
    await $fetch(props.apiEndpoint, {
      method: 'PUT',
      body: settings.value,
    })
    toast.add({
      title: 'Settings Saved',
      description: 'Receipt text settings have been updated.',
      color: 'success',
    })
    emit('saved')
    close()
  }
  catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save settings.'
    toast.add({
      title: 'Error',
      description: errorMessage,
      color: 'error',
    })
  }
  finally {
    saving.value = false
  }
}

function close() {
  isOpen.value = false
}

watch(isOpen, (newValue) => {
  if (newValue) {
    loadSettings()
  }
})
</script>
