<!--
  SalesPrinterForm
  Package-provided form for the sales printers collection.
  Replaces the CLI-generated _Form.vue (wired via componentName in
  useSalesPrinters config). Event is implied by the event workspace.
-->

<template>
  <CroutonFormActionButton
    v-if="action === 'delete'"
    :action="action"
    :collection="collection"
    :items="items"
    :loading="loading"
    @click="handleSubmit"
  />

  <UForm
    v-else
    :schema="schema"
    :state="state"
    @submit="handleSubmit"
    @error="handleValidationError"
  >
    <CroutonFormLayout :navigation-items="navigationItems" v-model="activeSection">
      <template #main>
        <div class="flex flex-col gap-4 p-1">
          <UFormField v-if="!hideEvent" label="Event" name="eventId" class="not-last:pb-4">
            <CroutonFormReferenceSelect
              v-model="state.eventId"
              collection="salesEvents"
              label="Event"
            />
          </UFormField>

          <UFormField label="Location" name="locationId" class="not-last:pb-4">
            <CroutonFormReferenceSelect
              v-model="state.locationId"
              collection="salesLocations"
              label="Location"
              :create-initial-data="{ eventId: state.eventId }"
            />
          </UFormField>

          <UFormField label="Title" name="title" class="not-last:pb-4">
            <UInput v-model="state.title" class="w-full" size="xl" />
          </UFormField>

          <UFormField label="IP Address" name="ipAddress" help="LAN IP of the printer (RUT956 hands these out via DHCP). Port is always 9100." class="not-last:pb-4">
            <UInput
              v-model="state.ipAddress"
              class="w-full"
              size="xl"
              placeholder="192.168.1.70"
              :ui="{ base: 'font-mono' }"
            />
          </UFormField>

          <UFormField label="Show prices on receipts" name="showPrices" class="not-last:pb-4">
            <UCheckbox v-model="state.showPrices" />
          </UFormField>

          <UFormField label="Active" name="isActive" class="not-last:pb-4">
            <UCheckbox v-model="state.isActive" />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <CroutonValidationErrorSummary
          v-if="validationErrors.length > 0"
          :tab-errors="tabErrorCounts"
          :navigation-items="navigationItems"
        />

        <CroutonFormActionButton
          :action="action"
          :collection="collection"
          :items="items"
          :loading="loading"
          :has-validation-errors="validationErrors.length > 0"
        />
      </template>
    </CroutonFormLayout>
  </UForm>
</template>

<script setup lang="ts">
// useSalesPrinters is auto-imported from the generated collection layer at runtime.
declare function useSalesPrinters(): {
  defaultValue: Record<string, any>
  schema: any
  collection: string
}

interface PrinterFormProps {
  action: 'create' | 'update' | 'delete'
  items?: Array<{ id: string }>
  activeItem?: Record<string, any> | null
}

const props = defineProps<PrinterFormProps>()
const { defaultValue, schema, collection } = useSalesPrinters()

const navigationItems = [
  { label: 'General', value: 'general' }
]

const activeSection = ref('general')

const validationErrors = ref<Array<{ name: string, message: string }>>([])
const handleValidationError = (event: any) => {
  if (event?.errors) validationErrors.value = event.errors
}

// Single-tab form — bucket every error under 'general'. Required: the summary
// component does Object.entries(tabErrors) and has no default for the prop.
const tabErrorCounts = computed<Record<string, number>>(() =>
  validationErrors.value.length ? { general: validationErrors.value.length } : ({} as Record<string, number>)
)

const { create, update, deleteItems } = useCollectionMutation(collection)
const { close, loading } = useCrouton()

// Merge activeItem for both create (preset eventId from the event workspace) and
// update (the full record being edited).
const initialValues = { ...defaultValue, ...(props.activeItem || {}) }

const state = ref<Record<string, any> & { id?: string | null }>(initialValues)

// Event is implied by the workspace — hide the selector when it's preset.
const hideEvent = computed(() => !!state.value.eventId)

const handleSubmit = async () => {
  try {
    if (props.action === 'create') {
      await create(state.value)
    } else if (props.action === 'update' && state.value.id) {
      await update(state.value.id, state.value)
    } else if (props.action === 'delete') {
      await deleteItems(props.items as any)
    }
    validationErrors.value = []
    close()
  } catch (error) {
    console.error('Form submission failed:', error)
  }
}
</script>