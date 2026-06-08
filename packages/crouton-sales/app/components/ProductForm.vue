<!--
  SalesProductForm
  Package-provided form for the sales products collection.
  Replaces the CLI-generated _Form.vue (wired via componentName in
  useSalesProducts config).

  - Event is implied by the event workspace, so the selector is hidden when
    eventId is preset (passed as initialData to crouton.open()).
  - Price accepts decimals (UInputNumber with currency formatting).
  - Remark prompt and option fields are revealed only when their toggles are on.
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
  >
    <CroutonFormLayout>
      <template #main>
        <div class="flex flex-col gap-6 p-1">
          <!-- Details -->
          <fieldset class="flex flex-col gap-4">
            <legend class="text-sm font-semibold text-highlighted mb-1">Details</legend>

            <UFormField v-if="!hideEvent" label="Event" name="eventId">
              <CroutonFormReferenceSelect
                v-model="state.eventId"
                collection="salesEvents"
                label="Event"
              />
            </UFormField>

            <UFormField label="Product Name" name="title">
              <UInput v-model="state.title" class="w-full" size="xl" />
            </UFormField>

            <UFormField label="Description" name="description">
              <UTextarea v-model="state.description" class="w-full" size="xl" />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Category" name="categoryId">
                <CroutonFormReferenceSelect
                  v-model="state.categoryId"
                  collection="salesCategories"
                  label="Category"
                />
              </UFormField>
              <UFormField label="Prep Location" name="locationId">
                <CroutonFormReferenceSelect
                  v-model="state.locationId"
                  collection="salesLocations"
                  label="Prep Location"
                />
              </UFormField>
            </div>

            <UFormField label="Price" name="price">
              <UInputNumber
                v-model="state.price"
                class="w-full"
                :min="0"
                :step="0.01"
                :format-options="{ style: 'currency', currency: 'EUR' }"
              />
            </UFormField>

            <UFormField name="isActive">
              <UCheckbox v-model="state.isActive" label="Active" />
            </UFormField>
          </fieldset>

          <USeparator />

          <!-- Remark -->
          <fieldset class="flex flex-col gap-4">
            <legend class="text-sm font-semibold text-highlighted mb-1">Remark</legend>
            <UFormField name="requiresRemark">
              <UCheckbox v-model="state.requiresRemark" label="Require a remark when ordering" />
            </UFormField>
            <UFormField v-if="state.requiresRemark" label="Remark Prompt" name="remarkPrompt" help="Shown to the cashier when adding this product">
              <UInput v-model="state.remarkPrompt" class="w-full" size="xl" />
            </UFormField>
          </fieldset>

          <USeparator />

          <!-- Options -->
          <fieldset class="flex flex-col gap-4">
            <legend class="text-sm font-semibold text-highlighted mb-1">Options</legend>
            <UFormField name="hasOptions">
              <UCheckbox v-model="state.hasOptions" label="This product has options (variants, extras…)" />
            </UFormField>
            <template v-if="state.hasOptions">
              <UFormField name="multipleOptionsAllowed">
                <UCheckbox v-model="state.multipleOptionsAllowed" label="Allow selecting multiple options" />
              </UFormField>
              <UFormField label="Options" name="options">
                <CroutonFormRepeater
                  v-model="state.options"
                  component-name="SalesProductsOptionInput"
                  add-label="Add Item"
                  :sortable="true"
                />
              </UFormField>
            </template>
          </fieldset>

          <USeparator />

          <UFormField label="Sort Order" name="sortOrder">
            <UInputNumber v-model="state.sortOrder" class="w-full" :min="0" />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <CroutonFormActionButton
          :action="action"
          :collection="collection"
          :items="items"
          :loading="loading"
        />
      </template>
    </CroutonFormLayout>
  </UForm>
</template>

<script setup lang="ts">
// useSalesProducts is auto-imported from the generated collection layer at runtime.
declare function useSalesProducts(): {
  defaultValue: Record<string, any>
  schema: any
  collection: string
}

interface ProductFormProps {
  action: 'create' | 'update' | 'delete'
  items?: Array<{ id: string }>
  activeItem?: Record<string, any> | null
}

const props = defineProps<ProductFormProps>()
const { defaultValue, schema, collection } = useSalesProducts()

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
    close()
  } catch (error) {
    console.error('Form submission failed:', error)
  }
}
</script>