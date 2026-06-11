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
            <legend class="text-sm font-semibold text-highlighted mb-1">{{ t('sales.form.details') }}</legend>

            <UFormField v-if="!hideEvent" :label="t('sales.form.event')" name="eventId">
              <CroutonFormReferenceSelect
                v-model="state.eventId"
                collection="salesEvents"
                :label="t('sales.form.event')"
              />
            </UFormField>

            <UFormField :label="t('sales.form.productName')" name="title" required>
              <UInput v-model="state.title" class="w-full" size="xl" />
            </UFormField>

            <UFormField :label="t('sales.form.description')" name="description">
              <UTextarea v-model="state.description" class="w-full" size="xl" />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('sales.form.category')" name="categoryId" required>
                <CroutonFormReferenceSelect
                  v-model="state.categoryId"
                  collection="salesCategories"
                  :label="t('sales.form.category')"
                  :create-initial-data="{ eventId: state.eventId }"
                  show-edit
                />
              </UFormField>
              <UFormField :label="t('sales.form.prepLocation')" name="locationId" required>
                <CroutonFormReferenceSelect
                  v-model="state.locationId"
                  collection="salesLocations"
                  :label="t('sales.form.prepLocation')"
                  :create-initial-data="{ eventId: state.eventId }"
                  show-edit
                />
              </UFormField>
            </div>

            <UFormField :label="t('sales.form.price')" name="price">
              <UInputNumber
                v-model="state.price"
                class="w-full"
                :min="0"
                :step="0.01"
                :format-options="{ style: 'currency', currency: 'EUR' }"
              />
            </UFormField>

            <UFormField name="isActive">
              <USwitch
                v-model="state.isActive"
                :label="t('sales.common.active')"
                :description="t('sales.form.activeHelp')"
              />
            </UFormField>
          </fieldset>

          <!-- Remark: card with a switch header that slides the prompt field open -->
          <div class="rounded-xl border border-default overflow-hidden">
            <div
              class="flex items-start justify-between gap-4 p-4 cursor-pointer select-none hover:bg-elevated/40 transition-colors"
              @click="state.requiresRemark = !state.requiresRemark"
            >
              <div class="flex items-start gap-3 min-w-0">
                <UIcon name="i-lucide-message-square-text" class="text-lg text-muted mt-0.5 shrink-0" />
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-highlighted">{{ t('sales.form.remark') }}</p>
                  <p class="text-sm text-muted mt-0.5">{{ t('sales.form.requireRemark') }}</p>
                </div>
              </div>
              <USwitch :model-value="!!state.requiresRemark" class="shrink-0" @click.stop @update:model-value="state.requiresRemark = $event" />
            </div>
            <UCollapsible :open="!!state.requiresRemark">
              <template #content>
                <div class="px-4 pb-4 pt-1 border-t border-default">
                  <UFormField :label="t('sales.form.remarkPrompt')" name="remarkPrompt" :help="t('sales.form.remarkPromptHelp')" class="pt-3">
                    <UInput v-model="state.remarkPrompt" class="w-full" size="xl" />
                  </UFormField>
                </div>
              </template>
            </UCollapsible>
          </div>

          <!-- Options: same card pattern, slides open the option editor -->
          <div class="rounded-xl border border-default overflow-hidden">
            <div
              class="flex items-start justify-between gap-4 p-4 cursor-pointer select-none hover:bg-elevated/40 transition-colors"
              @click="state.hasOptions = !state.hasOptions"
            >
              <div class="flex items-start gap-3 min-w-0">
                <UIcon name="i-lucide-list-plus" class="text-lg text-muted mt-0.5 shrink-0" />
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-highlighted">{{ t('sales.form.options') }}</p>
                  <p class="text-sm text-muted mt-0.5">{{ t('sales.form.hasOptions') }}</p>
                </div>
              </div>
              <USwitch :model-value="!!state.hasOptions" class="shrink-0" @click.stop @update:model-value="state.hasOptions = $event" />
            </div>
            <UCollapsible :open="!!state.hasOptions">
              <template #content>
                <div class="px-4 pb-4 pt-3 border-t border-default flex flex-col gap-4">
                  <UFormField name="multipleOptionsAllowed">
                    <USwitch v-model="state.multipleOptionsAllowed" :label="t('sales.form.allowMultipleOptions')" />
                  </UFormField>
                  <UFormField :label="t('sales.form.options')" name="options">
                    <CroutonFormRepeater
                      v-model="state.options"
                      component-name="SalesProductsOptionInput"
                      :add-label="t('sales.form.addItem')"
                      :sortable="true"
                    />
                  </UFormField>
                </div>
              </template>
            </UCollapsible>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="space-y-2">
          <CroutonFormActionButton
            :action="action"
            :collection="collection"
            :items="items"
            :loading="loading"
          />
          <!-- Two-step delete: first click arms, second click deletes. -->
          <UButton
            v-if="action === 'update' && state.id"
            block
            icon="i-lucide-trash-2"
            color="error"
            :variant="confirmingDelete ? 'solid' : 'ghost'"
            :label="confirmingDelete ? t('sales.common.confirmDelete') : t('common.delete')"
            :loading="deleting"
            @click="handleDelete"
          />
        </div>
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
const { t } = useT()
const { defaultValue, schema, collection } = useSalesProducts()

const { create, update, deleteItems } = useCollectionMutation(collection)
const { close, loading } = useCrouton()

// Merge activeItem for both create (preset eventId from the event workspace) and
// update (the full record being edited).
const initialValues = { ...defaultValue, ...(props.activeItem || {}) }

// New products default to active — the generated defaultValue says false,
// which silently created inactive products that the POS filters out
// ("where did my product go?"). Only an explicit isActive in initialData wins.
if (props.action === 'create' && !(props.activeItem && 'isActive' in props.activeItem)) {
  initialValues.isActive = true
}

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

// Delete from the update form: two-step (arm → confirm) instead of a nested
// delete overlay, which would leave this slideover open on a deleted record.
const confirmingDelete = ref(false)
const deleting = ref(false)

const handleDelete = async () => {
  if (!confirmingDelete.value) {
    confirmingDelete.value = true
    return
  }
  if (!state.value.id) return
  deleting.value = true
  try {
    await deleteItems([state.value.id])
    close()
  } catch (error) {
    console.error('Delete failed:', error)
  } finally {
    deleting.value = false
  }
}
</script>