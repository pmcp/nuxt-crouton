<!--
  @collection printers
  @layer sales

  Hand-fixed: cli regenerated this with a MapBox-driven "Address" tab that
  geocoded the IP address and stored locationId as JSON coordinates. Replaced
  with a plain form. Don't regenerate without --force or the maps stuff will
  come back.
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
          <UFormField label="Event" name="eventId" class="not-last:pb-4">
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
import type { SalesPrinterFormProps, SalesPrinterFormData } from '../../types'
import useSalesPrinters from '../composables/useSalesPrinters'

const props = defineProps<SalesPrinterFormProps>()
const { defaultValue, schema, collection } = useSalesPrinters()

const navigationItems = [
  { label: 'General', value: 'general' }
]

const activeSection = ref('general')

const validationErrors = ref<Array<{ name: string, message: string }>>([])
const handleValidationError = (event: any) => {
  if (event?.errors) validationErrors.value = event.errors
}

const { create, update, deleteItems } = useCollectionMutation(collection)
const { close, loading } = useCrouton()

const initialValues = props.action === 'update' && props.activeItem?.id
  ? { ...defaultValue, ...props.activeItem }
  : { ...defaultValue }

const state = ref<SalesPrinterFormData & { id?: string | null }>(initialValues)

const handleSubmit = async () => {
  try {
    if (props.action === 'create') {
      await create(state.value)
    }
    else if (props.action === 'update' && state.value.id) {
      await update(state.value.id, state.value)
    }
    else if (props.action === 'delete') {
      await deleteItems(props.items)
    }
    validationErrors.value = []
    close()
  }
  catch (error) {
    console.error('Form submission failed:', error)
  }
}
</script>
