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
          <UFormField label="Special Instructions Title" help="Shown above order notes on kitchen tickets">
            <UInput
              v-model="settings.special_instructions_title"
              placeholder="SPECIAL INSTRUCTIONS:"
            />
          </UFormField>

          <UFormField label="Staff Order Header" help="Banner printed on staff/personnel orders">
            <UInput
              v-model="settings.staff_order_header"
              placeholder="*** STAFF ORDER ***"
            />
          </UFormField>
        </div>

        <UFormField label="Footer Text" help="Printed at the bottom of customer receipts">
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
  special_instructions_title: string
  staff_order_header: string
  footer_text: string
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

const notify = useNotify()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const saving = ref(false)

const settings = ref<ReceiptSettings>({
  special_instructions_title: 'SPECIAL INSTRUCTIONS:',
  staff_order_header: '*** STAFF ORDER ***',
  footer_text: 'Thank you for your order!',
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
    notify.success('Settings Saved', { description: 'Receipt text settings have been updated.' })
    emit('saved')
    close()
  }
  catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save settings.'
    notify.error('Error', { description: errorMessage })
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
